"use client";

// Ramoncito: chat con IA y guía de la página. Un círculo con el sombrero abajo a la
// derecha, en todas las páginas.
// - Chat: funciona SIN iniciar sesión. Usa el conuco guardado (cuenta o cookie) y la
//   zona del mapa que la persona esté mirando.
// - Guía: globos cortos al tocar cosas difíciles (ver app/guia.ts) y, cada cierto
//   tiempo, algún consejo general. Cada consejo sale una sola vez y se pueden apagar.

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { readLocalConuco } from "@/lib/conuco-local";
import RichText from "./RichText";
import RamoncitoCall, { callSupported, prepareCall } from "./RamoncitoCall";
import { GENERAL_TIPS, MAP_TIPS, TIPS, type TipId } from "./guia";
import { useLang } from "@/lib/i18n";

type Msg = { role: "user" | "assistant"; content: string };
type Known = "loading" | "none" | "local" | "cuenta";
type Zone = { id: string; name: string } | null;

const EXAMPLES = {
  es: ["¿Qué siembro el mes que viene?", "¿Riego esta semana?", "¿Cómo protejo mi tierra de la lluvia?"],
  en: ["What should I plant next month?", "Should I water this week?", "How do I protect my soil from the rain?"],
};

const SEEN_KEY = "ramoncito-consejos-vistos";
const MUTE_KEY = "ramoncito-sin-consejos";
const OLD_HINT_KEY = "ramoncito-globo-cerrado"; // el globo de bienvenida de antes

const SHOW_MS = 13000; // cuánto dura un globo en pantalla
const MIN_GAP_MS = 4000; // un consejo nuevo no tapa a otro que acaba de salir
const GENERAL_EVERY_MS = 70000; // cada cuánto puede salir un consejo general
const GENERAL_MAX = 4; // máximo de consejos generales por visita

const store = {
  get(k: string) {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set(k: string, v: string) {
    try {
      localStorage.setItem(k, v);
    } catch {
      // sin almacenamiento (modo privado): solo vale para esta visita
    }
  },
  del(k: string) {
    try {
      localStorage.removeItem(k);
    } catch {
      // nada que borrar
    }
  },
};

export const openRamoncito = () => window.dispatchEvent(new Event("abrir-ramoncito"));

export default function RamoncitoChat() {
  const { lang, t } = useLang();
  const [open, setOpen] = useState(false);
  const [known, setKnown] = useState<Known>("loading");
  const [zone, setZone] = useState<Zone>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [tip, setTip] = useState<TipId | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ---------------- guía ----------------
  const seen = useRef<Set<string>>(new Set());
  const muted = useRef(false);
  const shownAt = useRef(0);
  const pending = useRef<TipId[]>([]); // consejos esperando turno, en orden
  const generalCount = useRef(0);
  const openRef = useRef(false);
  openRef.current = open;

  const show = useCallback((id: TipId) => {
    if (muted.current || seen.current.has(id)) return;
    // Un consejo del mapa que quedó esperando ya no sirve si el mapa se cerró
    if (MAP_TIPS.has(id) && !document.querySelector(".mapRoom .explorer")) {
      pending.current = pending.current.filter((x) => x !== id);
      return;
    }
    if (openRef.current || Date.now() - shownAt.current < MIN_GAP_MS) {
      if (!pending.current.includes(id)) pending.current = [...pending.current, id].slice(-3); // sale cuando haya un hueco
      return;
    }
    pending.current = pending.current.filter((x) => x !== id);
    seen.current.add(id);
    store.set(SEEN_KEY, JSON.stringify([...seen.current]));
    shownAt.current = Date.now();
    setTip(id);
  }, []);

  // Cargar los consejos que ya vio y si los apagó
  useEffect(() => {
    try {
      seen.current = new Set(JSON.parse(store.get(SEEN_KEY) ?? "[]"));
    } catch {
      seen.current = new Set();
    }
    if (store.get(OLD_HINT_KEY) === "1") seen.current.add("hola");
    muted.current = store.get(MUTE_KEY) === "1";
    const hello = setTimeout(() => show("hola"), 1200);
    const onTip = (e: Event) => show((e as CustomEvent<TipId>).detail);
    window.addEventListener("ramoncito-guia", onTip);
    return () => {
      clearTimeout(hello);
      window.removeEventListener("ramoncito-guia", onTip);
    };
  }, [show]);

  // Cada globo se va solo; después sale el que estaba esperando
  useEffect(() => {
    if (!tip) {
      const next = setTimeout(() => pending.current.length && show(pending.current[0]), 1500);
      return () => clearTimeout(next);
    }
    const hide = setTimeout(() => setTip(null), SHOW_MS);
    return () => clearTimeout(hide);
  }, [tip, open, show]);

  // De vez en cuando, un consejo general (sin molestar: pocos y espaciados)
  useEffect(() => {
    const iv = setInterval(() => {
      if (muted.current || openRef.current || document.hidden || generalCount.current >= GENERAL_MAX) return;
      if (Date.now() - shownAt.current < GENERAL_EVERY_MS - 5000) return;
      const onMap = !!document.querySelector(".mapRoom .explorer");
      const id = GENERAL_TIPS[onMap ? "map" : "home"].find((x) => !seen.current.has(x));
      if (!id) return;
      generalCount.current++;
      show(id);
    }, GENERAL_EVERY_MS);
    return () => clearInterval(iv);
  }, [show]);

  const closeTip = () => setTip(null);
  const muteTips = () => {
    muted.current = true;
    pending.current = [];
    store.set(MUTE_KEY, "1");
    setTip(null);
  };

  // ---------------- chat ----------------

  // ¿Tiene un conuco guardado? (en su cuenta o en este navegador)
  const checkKnown = useCallback(async () => {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      try {
        const sb = supabaseBrowser();
        const {
          data: { session },
        } = await sb.auth.getSession();
        if (session) {
          const { data } = await sb.from("conucos").select("id").eq("user_id", session.user.id).maybeSingle();
          if (data) return setKnown("cuenta");
        }
      } catch {
        // sin conexión con Supabase: se mira la cookie
      }
    }
    setKnown(readLocalConuco() ? "local" : "none");
  }, []);

  useEffect(() => {
    checkKnown();
    window.addEventListener("conuco-cambio", checkKnown);
    return () => window.removeEventListener("conuco-cambio", checkKnown);
  }, [checkKnown]);

  // La zona del mapa que la persona está mirando (para responder sobre esa zona)
  useEffect(() => {
    const onZone = (e: Event) => setZone((e as CustomEvent<Zone>).detail);
    window.addEventListener("zona-elegida", onZone);
    return () => window.removeEventListener("zona-elegida", onZone);
  }, []);

  // Refs para que «send» siempre vea lo último (también cuando la llama un evento)
  const msgsRef = useRef<Msg[]>([]);
  msgsRef.current = msgs;
  const busyRef = useRef(false);
  const zoneRef = useRef<Zone>(null);
  zoneRef.current = zone;
  const langRef = useRef(lang);
  langRef.current = lang;

  // Devuelve la respuesta (la usa la llamada para leerla en voz alta), o null si falló
  const send = useCallback(async (text: string, zoneId?: string, voice = false): Promise<string | null> => {
    const q = text.trim();
    if (!q || busyRef.current) return null;
    let reply: string | null = null;
    const en = langRef.current === "en";
    const next: Msg[] = [...msgsRef.current, { role: "user", content: q.slice(0, 1500) }];
    msgsRef.current = next;
    setMsgs(next);
    setInput("");
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/ramoncito", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "chat", messages: next, lang: langRef.current, zoneId: zoneId ?? zoneRef.current?.id, voice }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || (en ? "Ramoncito couldn't answer right now." : "Ramoncito no pudo responder ahora."));
      reply = String(j.reply ?? "");
      const done: Msg[] = [...next, { role: "assistant", content: reply }];
      msgsRef.current = done;
      setMsgs(done);
    } catch (e) {
      setError((e as Error).message);
    }
    busyRef.current = false;
    setBusy(false);
    return reply;
  }, []);

  // ---------------- llamada por voz ----------------
  const [calling, setCalling] = useState(false);
  const [canCall, setCanCall] = useState(false);
  useEffect(() => setCanCall(callSupported()), []);
  const startCall = () => {
    prepareCall(langRef.current); // dentro del toque: desbloquea el audio y Ramoncito saluda
    setTip(null);
    setCalling(true);
  };
  const askByVoice = useCallback((text: string) => send(text, undefined, true), [send]);
  const hangUp = useCallback(() => setCalling(false), []);

  // Abrir el chat (desde un botón) o abrirlo con una pregunta ya escrita
  useEffect(() => {
    const onOpen = () => setOpen(true);
    const onAsk = (e: Event) => {
      const { question, zoneId } = (e as CustomEvent<{ question: string; zoneId?: string }>).detail;
      setOpen(true);
      setTip(null);
      send(question, zoneId);
    };
    window.addEventListener("abrir-ramoncito", onOpen);
    window.addEventListener("preguntar-ramoncito", onAsk);
    return () => {
      window.removeEventListener("abrir-ramoncito", onOpen);
      window.removeEventListener("preguntar-ramoncito", onAsk);
    };
  }, [send]);

  useEffect(() => {
    if (!open) return;
    setTip(null);
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [msgs, busy]);

  return (
    <>
      {tip && !open && (
        <div className="rcHint" role="status" key={tip}>
          <div className="rcHintMain">
            <button type="button" className="rcHintText" onClick={() => setOpen(true)}>
              {t(TIPS[tip].es, TIPS[tip].en)}
            </button>
            <button type="button" className="rcHintMute" onClick={muteTips}>
              {t("No mostrar más consejos", "Don't show more tips")}
            </button>
          </div>
          <button type="button" className="rcHintClose" onClick={closeTip} aria-label={t("Cerrar este mensaje", "Close this message")}>
            ×
          </button>
        </div>
      )}
      <button
        type="button"
        className={`rcFab${open ? " isOpen" : ""}`}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="ramoncito-chat"
        aria-label={open ? t("Cerrar el chat de Ramoncito", "Close Ramoncito chat") : t("Hablar con Ramoncito (IA)", "Talk to Ramoncito (AI)")}
      >
        <Image src="/ia-sombrero.png" alt="" width={256} height={256} />
      </button>

      {open && (
        <section id="ramoncito-chat" className="rcPanel" role="dialog" aria-label={t("Chat con Ramoncito", "Chat with Ramoncito")}>
          <header className="rcHead">
            <span className="rcAvatar">
              <Image src="/ia-sombrero.png" alt="" width={256} height={256} />
            </span>
            <div>
              <strong>Ramoncito</strong>
              <span>{t("Tu asistente del conuco · IA", "Your conuco assistant · AI")}</span>
            </div>
            {canCall && (
              <button
                type="button"
                className="rcCallIcon"
                onClick={startCall}
                aria-label={t("Llamar a Ramoncito (hablar por voz)", "Call Ramoncito (talk by voice)")}
                title={t("Llamar a Ramoncito", "Call Ramoncito")}
              >
                📞
              </button>
            )}
            <button type="button" className="rcClose" onClick={() => setOpen(false)} aria-label={t("Cerrar", "Close")}>
              ×
            </button>
          </header>

          <div className="rcBody" aria-live="polite">
            {canCall && !msgs.length && (
              <button type="button" className="rcCallCta" onClick={startCall}>
                <span aria-hidden="true">📞</span>
                <span>
                  <b>{t("Llamar a Ramoncito", "Call Ramoncito")}</b>
                  <small>{t("Habla con él por voz, como una llamada", "Talk by voice, like a phone call")}</small>
                </span>
              </button>
            )}
            {known === "none" && (
              <div className="rcNote rcNoteSoft">
                <p>
                  {zone
                    ? t(
                        `Te respondo con los datos de la zona que tocaste en el mapa (${zone.name}).`,
                        `I'll answer with the data for the area you tapped on the map (${zone.name}).`,
                      )
                    : t(
                        "Te respondo con datos generales del Cibao. Toca una zona en el mapa o registra tu conuco para consejos de tu tierra.",
                        "I'll answer with general Cibao data. Tap an area on the map or register your conuco for advice about your land.",
                      )}
                </p>
                <Link href="/mi-conuco" className="rcRegister" onClick={() => setOpen(false)}>
                  {t("Registrar mi conuco (sin cuenta)", "Register my conuco (no account)")}
                </Link>
              </div>
            )}

            {!msgs.length && (
              <>
                <div className="bubbleMsg bot">
                  <p>
                    {t(
                      "Hola. Puedes preguntarme qué sembrar, cuándo regar, cómo cuidar tu tierra o qué significa algo de la página.",
                      "Hi. You can ask me what to plant, when to water, how to care for your soil or what something on the page means.",
                    )}
                  </p>
                </div>
                <div className="rcChips">
                  {EXAMPLES[lang].map((q) => (
                    <button key={q} type="button" onClick={() => send(q)} disabled={busy}>
                      {q}
                    </button>
                  ))}
                </div>
              </>
            )}
            {msgs.map((m, i) => (
              <div key={i} className={`bubbleMsg ${m.role === "user" ? "me" : "bot"}`}>
                {m.role === "assistant" ? <RichText text={m.content} /> : m.content}
              </div>
            ))}
            {busy && <div className="bubbleMsg bot rcTyping">{t("Ramoncito está escribiendo…", "Ramoncito is typing…")}</div>}
            {error && <p className="mcError">{error}</p>}
            <div ref={endRef} />
          </div>

          <form
            className="chatForm rcForm"
            onSubmit={(e) => {
              e.preventDefault();
              if (!busy) send(input);
            }}
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t("Escribe tu pregunta…", "Type your question…")}
              maxLength={1500}
              aria-label={t("Tu pregunta para Ramoncito", "Your question for Ramoncito")}
            />
            <button type="submit" className="cta" disabled={busy || !input.trim()}>
              {t("Enviar", "Send")}
            </button>
          </form>
          <p className="rcFoot">{t("Ramoncito es una IA: puede equivocarse. Confírmalo con un técnico agrícola.", "Ramoncito is an AI: it can make mistakes. Check with an agronomist.")}</p>
        </section>
      )}

      {calling && <RamoncitoCall ask={askByVoice} onHangUp={hangUp} />}
    </>
  );
}
