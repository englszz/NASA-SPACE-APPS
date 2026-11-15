"use client";

// Chat flotante de Ramoncito (IA). Un círculo con el sombrero abajo a la derecha,
// en todas las páginas. Se abre al tocarlo o con el evento «abrir-ramoncito».

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import RichText from "./RichText";
import { useLang } from "@/lib/i18n";

type Msg = { role: "user" | "assistant"; content: string };
type Access = "loading" | "noconfig" | "guest" | "noconuco" | "ready";

const EXAMPLES = {
  es: ["¿Qué siembro el mes que viene?", "¿Riego esta semana?", "¿Cómo protejo mi tierra de la lluvia?"],
  en: ["What should I plant next month?", "Should I water this week?", "How do I protect my soil from the rain?"],
};

const HINT_KEY = "ramoncito-globo-cerrado";

export const openRamoncito = () => window.dispatchEvent(new Event("abrir-ramoncito"));

export default function RamoncitoChat() {
  const { lang, t } = useLang();
  const [open, setOpen] = useState(false);
  const [access, setAccess] = useState<Access>("loading");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [hint, setHint] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ¿Puede usar la IA? (sesión iniciada y conuco registrado)
  const checkAccess = useCallback(async () => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return setAccess("noconfig");
    try {
      const sb = supabaseBrowser();
      const {
        data: { user },
      } = await sb.auth.getUser();
      if (!user) return setAccess("guest");
      const { data } = await sb.from("conucos").select("id").eq("user_id", user.id).maybeSingle();
      setAccess(data ? "ready" : "noconuco");
    } catch {
      setAccess("guest");
    }
  }, []);

  // Globo «Soy tu asistente virtual»: se muestra hasta que la persona lo cierra con la X
  useEffect(() => {
    let closed = false;
    try {
      closed = localStorage.getItem(HINT_KEY) === "1";
    } catch {
      // sin almacenamiento (modo privado): se muestra igual
    }
    if (closed) return;
    const t = setTimeout(() => setHint(true), 1200);
    return () => clearTimeout(t);
  }, []);

  const closeHint = () => {
    setHint(false);
    try {
      localStorage.setItem(HINT_KEY, "1");
    } catch {
      // sin almacenamiento: solo se oculta por ahora
    }
  };

  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener("abrir-ramoncito", show);
    return () => window.removeEventListener("abrir-ramoncito", show);
  }, []);

  useEffect(() => {
    if (!open) return;
    checkAccess();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, checkAccess]);

  useEffect(() => {
    if (open && access === "ready") inputRef.current?.focus();
  }, [open, access]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [msgs, busy]);

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || busy) return;
    const next: Msg[] = [...msgs, { role: "user", content: q.slice(0, 1500) }];
    setMsgs(next);
    setInput("");
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/ramoncito", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "chat", messages: next, lang }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || t("Ramoncito no pudo responder ahora.", "Ramoncito couldn't answer right now."));
      setMsgs([...next, { role: "assistant", content: j.reply }]);
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
  };

  return (
    <>
      {hint && !open && (
        <div className="rcHint" role="status">
          <button type="button" className="rcHintText" onClick={() => setOpen(true)}>
            {lang === "en" ? (
              <>
                Hi! My name is Ramoncito and I'm your virtual assistant. <b>Ask me anything!</b>
              </>
            ) : (
              <>
                ¡Hola! Mi nombre es Ramoncito y soy tu asistente virtual. <b>¡Consulta cualquier duda!</b>
              </>
            )}
          </button>
          <button type="button" className="rcHintClose" onClick={closeHint} aria-label={t("Cerrar este mensaje", "Close this message")}>
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
            <button type="button" className="rcClose" onClick={() => setOpen(false)} aria-label={t("Cerrar", "Close")}>
              ×
            </button>
          </header>

          <div className="rcBody" aria-live="polite">
            {access === "loading" && <p className="hint">{t("Un momento…", "One moment…")}</p>}

            {access === "noconfig" && (
              <p className="rcNote">{t("El chat todavía no está configurado en esta web.", "Chat isn't set up on this site yet.")}</p>
            )}

            {access === "guest" && (
              <div className="rcNote">
                {lang === "en" ? (
                  <>
                    <p>
                      Hi, I'm Ramoncito. To give you advice about <b>your</b> conuco (farm), I need to know where it is.
                    </p>
                    <p>Sign in with Google and register it: it takes a minute and only you can see your data.</p>
                  </>
                ) : (
                  <>
                    <p>
                      Hola, soy Ramoncito. Para darte consejos sobre <b>tu</b> conuco necesito saber dónde está.
                    </p>
                    <p>Entra con Google y regístralo: toma un minuto y tus datos solo los ves tú.</p>
                  </>
                )}
                <Link href="/mi-conuco" className="cta rcCta" onClick={() => setOpen(false)}>
                  {t("Entrar a Mi conuco", "Go to My conuco")}
                </Link>
              </div>
            )}

            {access === "noconuco" && (
              <div className="rcNote">
                <p>{t("Ya entraste. Ahora cuéntame de tu conuco para poder ayudarte.", "You're signed in. Now tell me about your conuco so I can help.")}</p>
                <Link href="/mi-conuco" className="cta rcCta" onClick={() => setOpen(false)}>
                  {t("Registrar mi conuco", "Register my conuco")}
                </Link>
              </div>
            )}

            {access === "ready" && (
              <>
                {!msgs.length && (
                  <>
                    <div className="bubbleMsg bot">
                      <p>
                        {t(
                          "Hola. Puedes preguntarme sobre tu conuco: qué sembrar, cuándo regar o cómo cuidar tu tierra.",
                          "Hi. You can ask me about your conuco: what to plant, when to water or how to care for your soil.",
                        )}
                      </p>
                    </div>
                    <div className="rcChips">
                      {EXAMPLES[lang].map((q) => (
                        <button key={q} type="button" onClick={() => send(q)}>
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
              </>
            )}
            <div ref={endRef} />
          </div>

          {access === "ready" && (
            <form
              className="chatForm rcForm"
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
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
          )}
          <p className="rcFoot">{t("Ramoncito es una IA: puede equivocarse. Confírmalo con un técnico agrícola.", "Ramoncito is an AI: it can make mistakes. Check with an agronomist.")}</p>
        </section>
      )}
    </>
  );
}
