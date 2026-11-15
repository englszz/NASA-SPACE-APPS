"use client";

// Chat flotante de Ramoncito (IA). Un círculo con el sombrero abajo a la derecha,
// en todas las páginas. Se abre al tocarlo o con el evento «abrir-ramoncito».

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import RichText from "./RichText";

type Msg = { role: "user" | "assistant"; content: string };
type Access = "loading" | "noconfig" | "guest" | "noconuco" | "ready";

const EXAMPLES = ["¿Qué siembro el mes que viene?", "¿Riego esta semana?", "¿Cómo protejo mi tierra de la lluvia?"];

export const openRamoncito = () => window.dispatchEvent(new Event("abrir-ramoncito"));

export default function RamoncitoChat() {
  const [open, setOpen] = useState(false);
  const [access, setAccess] = useState<Access>("loading");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
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
        body: JSON.stringify({ mode: "chat", messages: next }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "Ramoncito no pudo responder ahora.");
      setMsgs([...next, { role: "assistant", content: j.reply }]);
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
  };

  return (
    <>
      <button
        type="button"
        className={`rcFab${open ? " isOpen" : ""}`}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="ramoncito-chat"
        aria-label={open ? "Cerrar el chat de Ramoncito" : "Hablar con Ramoncito (IA)"}
      >
        <Image src="/ia-sombrero.png" alt="" width={256} height={256} />
        {!open && <span className="rcFabTag">IA</span>}
      </button>

      {open && (
        <section id="ramoncito-chat" className="rcPanel" role="dialog" aria-label="Chat con Ramoncito">
          <header className="rcHead">
            <span className="rcAvatar">
              <Image src="/ia-sombrero.png" alt="" width={256} height={256} />
            </span>
            <div>
              <strong>Ramoncito</strong>
              <span>Tu asistente del conuco · IA</span>
            </div>
            <button type="button" className="rcClose" onClick={() => setOpen(false)} aria-label="Cerrar">
              ×
            </button>
          </header>

          <div className="rcBody" aria-live="polite">
            {access === "loading" && <p className="hint">Un momento…</p>}

            {access === "noconfig" && (
              <p className="rcNote">El chat todavía no está configurado en esta web.</p>
            )}

            {access === "guest" && (
              <div className="rcNote">
                <p>
                  <b>¡Klk!</b> Soy Ramoncito. Para darte consejos de <b>tu</b> conuco necesito saber dónde está.
                </p>
                <p>Entra con Google y regístralo: toma un minuto y tus datos solo los ves tú.</p>
                <Link href="/mi-conuco" className="cta rcCta" onClick={() => setOpen(false)}>
                  Entrar a Mi conuco
                </Link>
              </div>
            )}

            {access === "noconuco" && (
              <div className="rcNote">
                <p>Ya entraste. Ahora cuéntame de tu conuco para poder ayudarte.</p>
                <Link href="/mi-conuco" className="cta rcCta" onClick={() => setOpen(false)}>
                  Registrar mi conuco
                </Link>
              </div>
            )}

            {access === "ready" && (
              <>
                {!msgs.length && (
                  <>
                    <div className="bubbleMsg bot">
                      <p>
                        ¡Klk! Pregúntame lo que quieras de tu conuco: qué sembrar, cuándo regar o cómo cuidar tu tierra.
                      </p>
                    </div>
                    <div className="rcChips">
                      {EXAMPLES.map((q) => (
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
                {busy && <div className="bubbleMsg bot rcTyping">Ramoncito está escribiendo…</div>}
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
                placeholder="Escribe tu pregunta…"
                maxLength={1500}
                aria-label="Tu pregunta para Ramoncito"
              />
              <button type="submit" className="cta" disabled={busy || !input.trim()}>
                Enviar
              </button>
            </form>
          )}
          <p className="rcFoot">Ramoncito es una IA: puede equivocarse. Confírmalo con un técnico agrícola.</p>
        </section>
      )}
    </>
  );
}
