"use client";

// «Llamar a Ramoncito»: una conversación por voz, como una llamada.
//   1. Escucha el micrófono y detecta cuándo la persona habla y cuándo termina (silencio).
//   2. Envía el audio a /api/ramoncito/voz (Whisper en Groq) y recibe el texto.
//   3. Le pregunta a Ramoncito (la misma IA del chat) pidiendo una respuesta corta para voz.
//   4. Lee la respuesta en voz alta con la voz del propio teléfono o computadora.
//   5. Vuelve a escuchar, hasta que la persona cuelga.
// Mientras Ramoncito habla no se graba (así no se escucha a sí mismo).

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLang, type Lang } from "@/lib/i18n";

type Phase = "connecting" | "listening" | "hearing" | "thinking" | "speaking" | "muted" | "error";

const SILENCE_MS = 1300; // silencio que marca el final de una frase
const MAX_TURN_MS = 30000; // máximo por turno
const IDLE_MS = 15000; // si no habla en este tiempo, pregunta si sigue ahí
const MIN_VOICE_MS = 350; // menos que esto es un ruido, no una frase

// ---------- voz del teléfono (texto → voz) ----------

let audioCtx: AudioContext | null = null;
let greetingDone: Promise<void> = Promise.resolve();

function pickVoice(lang: Lang) {
  const voices = typeof speechSynthesis !== "undefined" ? speechSynthesis.getVoices() : [];
  const pref = lang === "en" ? ["en-US", "en-GB", "en"] : ["es-DO", "es-US", "es-419", "es-MX", "es-ES", "es"];
  for (const p of pref) {
    const v = voices.find((x) => x.lang.replace("_", "-").toLowerCase().startsWith(p.toLowerCase()));
    if (v) return v;
  }
  return null;
}

/** Quita lo que no se debe leer en voz alta (negritas, viñetas, emojis…) */
const forSpeech = (s: string) =>
  s
    .replace(/\*\*|__|`|#+\s/g, "")
    .replace(/^\s*[-*•]\s+/gm, "")
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "")
    .replace(/\s+/g, " ")
    .trim();

/** Lee un texto frase por frase (Chrome corta los textos largos si van de una vez) */
function speak(text: string, lang: Lang): Promise<void> {
  return new Promise((resolve) => {
    if (typeof speechSynthesis === "undefined") return resolve();
    speechSynthesis.cancel();
    const parts = forSpeech(text).match(/[^.!?¡¿]+[.!?]*|[¡¿][^.!?]+[.!?]*/g)?.map((p) => p.trim()).filter(Boolean) ?? [];
    if (!parts.length) return resolve();
    const voice = pickVoice(lang);
    let left = parts.length;
    const done = () => {
      left--;
      if (left <= 0) resolve();
    };
    for (const p of parts) {
      const u = new SpeechSynthesisUtterance(p);
      u.lang = lang === "en" ? "en-US" : "es-US";
      if (voice) u.voice = voice;
      u.rate = 1;
      u.onend = done;
      u.onerror = () => {
        left = 0;
        resolve();
      };
      speechSynthesis.speak(u);
    }
    // Por si el navegador nunca avisa que terminó
    setTimeout(resolve, 5000 + forSpeech(text).length * 130);
  });
}

/**
 * Se llama DENTRO del toque en «Llamar» (los navegadores solo dejan usar el audio
 * después de un toque): prepara el audio y Ramoncito saluda.
 */
export function prepareCall(lang: Lang) {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = audioCtx ?? new AC();
    void audioCtx.resume();
  } catch {
    audioCtx = null;
  }
  greetingDone = speak(
    lang === "en"
      ? "Hi, this is Ramoncito. I'm listening: tell me how I can help."
      : "¡Hola! Soy Ramoncito. Te escucho: dime en qué te ayudo.",
    lang,
  );
}

export const callSupported = () =>
  typeof window !== "undefined" &&
  !!navigator.mediaDevices?.getUserMedia &&
  typeof MediaRecorder !== "undefined" &&
  typeof speechSynthesis !== "undefined";

// ---------- la llamada ----------

export default function RamoncitoCall({
  ask,
  onHangUp,
}: {
  /** Pregunta a Ramoncito (la misma IA del chat) y devuelve la respuesta, o null si falló */
  ask: (text: string) => Promise<string | null>;
  onHangUp: () => void;
}) {
  const { lang, t } = useLang();
  const [phase, setPhase] = useState<Phase>("connecting");
  const [heard, setHeard] = useState("");
  const [reply, setReply] = useState("");
  const [error, setError] = useState("");
  const [secs, setSecs] = useState(0);

  const alive = useRef(true);
  const stream = useRef<MediaStream | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const raf = useRef(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mutedRef = useRef(false);
  const idleCount = useRef(0);
  const langRef = useRef(lang);
  langRef.current = lang;

  // Reloj de la llamada
  useEffect(() => {
    const iv = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(iv);
  }, []);

  const stopRecording = () => {
    cancelAnimationFrame(raf.current);
    if (recorder.current && recorder.current.state !== "inactive") recorder.current.stop();
  };

  const say = useCallback(async (text: string) => {
    if (!alive.current) return;
    setPhase("speaking");
    await speak(text, langRef.current);
  }, []);

  // Un turno: escuchar → transcribir → preguntar → hablar → (otro turno)
  const listen = useCallback(async () => {
    if (!alive.current || !stream.current) return;
    if (mutedRef.current) return setPhase("muted");
    setPhase("listening");

    const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"].find((m) =>
      MediaRecorder.isTypeSupported?.(m),
    );
    const rec = new MediaRecorder(stream.current, mime ? { mimeType: mime } : undefined);
    recorder.current = rec;
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);

    // Detector de voz: mide el volumen del micrófono varias veces por segundo.
    // Los primeros 400 ms sirven para medir el ruido de fondo.
    const analyser = analyserRef.current;
    const buf = new Float32Array(analyser?.fftSize ?? 1024);
    const start = performance.now();
    let noiseSum = 0;
    let noiseN = 0;
    let voiceMs = 0;
    let lastVoice = 0;
    let last = start;
    let spoke = false;

    const finished = new Promise<boolean>((resolve) => {
      rec.onstop = () => resolve(spoke && voiceMs >= MIN_VOICE_MS);
      const tick = () => {
        const now = performance.now();
        const dt = now - last;
        last = now;
        let rms = 0.05; // sin analizador: se asume voz y se corta por tiempo
        if (analyser) {
          analyser.getFloatTimeDomainData(buf);
          rms = Math.sqrt(buf.reduce((a, x) => a + x * x, 0) / buf.length);
          if (now - start < 400) {
            noiseSum += rms;
            noiseN++;
          }
        }
        const thr = Math.max(0.012, (noiseN ? noiseSum / noiseN : 0.005) * 2.5);
        if (rms > thr) {
          voiceMs += dt;
          lastVoice = now;
          if (!spoke && voiceMs > 150) {
            spoke = true;
            setPhase("hearing");
          }
        }
        const elapsed = now - start;
        if (
          (spoke && now - lastVoice > SILENCE_MS) ||
          elapsed > MAX_TURN_MS ||
          (!spoke && elapsed > IDLE_MS) ||
          !alive.current ||
          mutedRef.current
        ) {
          rec.stop();
          return;
        }
        raf.current = requestAnimationFrame(tick);
      };
      raf.current = requestAnimationFrame(tick);
    });
    rec.start(250);

    const gotSpeech = await finished;
    if (!alive.current) return;
    if (mutedRef.current) return setPhase("muted");

    if (!gotSpeech) {
      // Nadie habló: pregunta una vez si sigue ahí; a la segunda, cuelga
      idleCount.current++;
      if (idleCount.current >= 3) return onHangUp();
      if (idleCount.current === 2)
        await say(langRef.current === "en" ? "Are you still there? I'm listening." : "¿Sigues ahí? Te escucho.");
      return listen();
    }
    idleCount.current = 0;

    // Voz → texto
    setPhase("thinking");
    const blob = new Blob(chunks, { type: rec.mimeType || "audio/webm" });
    const ext = blob.type.includes("mp4") ? "mp4" : blob.type.includes("ogg") ? "ogg" : "webm";
    let text = "";
    try {
      const fd = new FormData();
      fd.append("audio", blob, `voz.${ext}`);
      const r = await fetch(`/api/ramoncito/voz?lang=${langRef.current}`, { method: "POST", body: fd });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error);
      text = String(j.text ?? "").trim();
    } catch (e) {
      const msg = (e as Error).message || (langRef.current === "en" ? "I couldn't hear you well." : "No te escuché bien.");
      await say(msg);
      return listen();
    }
    if (!alive.current) return;
    if (!text) {
      await say(langRef.current === "en" ? "Sorry, I didn't catch that. Could you say it again?" : "Perdona, no te entendí. ¿Me lo repites?");
      return listen();
    }
    setHeard(text);
    setReply("");

    // Texto → Ramoncito → voz
    const answer = await ask(text);
    if (!alive.current) return;
    const spoken =
      answer ??
      (langRef.current === "en" ? "Sorry, I couldn't answer right now. Try again in a moment." : "Perdona, ahora no pude responder. Inténtalo otra vez en un momento.");
    setReply(forSpeech(spoken));
    await say(spoken);
    return listen();
  }, [ask, onHangUp, say]);

  // Empezar: pedir el micrófono, esperar el saludo y escuchar
  useEffect(() => {
    alive.current = true;
    (async () => {
      try {
        stream.current = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
      } catch {
        speechSynthesis.cancel();
        setError(
          t(
            "Necesito permiso para usar el micrófono. Actívalo en tu navegador y vuelve a llamar.",
            "I need permission to use the microphone. Allow it in your browser and call again.",
          ),
        );
        setPhase("error");
        return;
      }
      if (audioCtx) {
        try {
          const src = audioCtx.createMediaStreamSource(stream.current);
          const an = audioCtx.createAnalyser();
          an.fftSize = 1024;
          src.connect(an);
          analyserRef.current = an;
        } catch {
          analyserRef.current = null;
        }
      }
      setPhase("speaking");
      await greetingDone;
      listen();
    })();
    return () => {
      alive.current = false;
      cancelAnimationFrame(raf.current);
      if (recorder.current && recorder.current.state !== "inactive") recorder.current.stop();
      stream.current?.getTracks().forEach((tr) => tr.stop());
      if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onHangUp();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onHangUp]);

  const toggleMute = () => {
    mutedRef.current = !mutedRef.current;
    if (mutedRef.current) {
      stopRecording();
      setPhase((p) => (p === "listening" || p === "hearing" ? "muted" : p));
    } else if (phase === "muted") listen();
  };

  // Cortar a Ramoncito mientras habla para hablar uno
  const interrupt = () => speechSynthesis.cancel();

  const STATUS: Record<Phase, string> = {
    connecting: t("Llamando…", "Calling…"),
    listening: t("Te escucho… habla cuando quieras", "I'm listening… go ahead"),
    hearing: t("Te escucho…", "Listening…"),
    thinking: t("Ramoncito está pensando…", "Ramoncito is thinking…"),
    speaking: t("Ramoncito está hablando", "Ramoncito is speaking"),
    muted: t("Micrófono apagado", "Microphone off"),
    error: t("No se pudo hacer la llamada", "The call couldn't start"),
  };
  const clock = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;

  return (
    <div className={`rcCall is-${phase}`} role="dialog" aria-label={t("Llamada con Ramoncito", "Call with Ramoncito")}>
      <div className="rcCallTop">
        <p className="rcCallName">Ramoncito</p>
        <p className="rcCallClock">{phase === "error" ? "" : clock}</p>
      </div>

      <div className="rcCallAvatar" aria-hidden="true">
        <span className="ring r1" />
        <span className="ring r2" />
        <span className="ring r3" />
        <Image src="/ramoncito.svg" alt="" width={606} height={516} />
      </div>

      <p className="rcCallStatus" aria-live="polite">
        {STATUS[phase]}
      </p>

      {error ? (
        <p className="rcCallError">{error}</p>
      ) : (
        <div className="rcCallCaptions" aria-live="polite">
          {heard && (
            <p className="me">
              <span>{t("Tú", "You")}</span>
              {heard}
            </p>
          )}
          {reply && (
            <p className="bot">
              <span>Ramoncito</span>
              {reply}
            </p>
          )}
        </div>
      )}

      <div className="rcCallActions">
        {phase !== "error" && (
          <button type="button" className={`rcCallBtn${phase === "muted" ? " isOn" : ""}`} onClick={toggleMute}>
            <span aria-hidden="true">{phase === "muted" ? "🔇" : "🎤"}</span>
            {phase === "muted" ? t("Activar micrófono", "Unmute") : t("Silenciar", "Mute")}
          </button>
        )}
        {phase === "speaking" && (
          <button type="button" className="rcCallBtn" onClick={interrupt}>
            <span aria-hidden="true">✋</span>
            {t("Hablar yo", "Let me talk")}
          </button>
        )}
        <button type="button" className="rcCallBtn rcHangUp" onClick={onHangUp}>
          <span aria-hidden="true">📞</span>
          {t("Colgar", "Hang up")}
        </button>
      </div>

      <p className="rcCallFoot">
        {t(
          "Ramoncito es una IA y puede equivocarse. Tu voz se convierte en texto con Groq y no se guarda.",
          "Ramoncito is an AI and can make mistakes. Your voice is turned into text with Groq and isn't stored.",
        )}
      </p>
    </div>
  );
}
