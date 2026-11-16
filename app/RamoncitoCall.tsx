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
let greetingDone: Promise<boolean> = Promise.resolve(true);

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

// Chrome borra los textos en cola si nadie los guarda, y entonces se queda callado
const keep: SpeechSynthesisUtterance[] = [];
const isAndroid = () => /android/i.test(navigator.userAgent);

// Las voces cargan tarde en algunos navegadores: se piden desde el principio
if (typeof window !== "undefined" && "speechSynthesis" in window) {
  speechSynthesis.getVoices();
  speechSynthesis.addEventListener?.("voiceschanged", () => speechSynthesis.getVoices());
}

/**
 * Lee un texto en voz alta, frase por frase. Devuelve false si el navegador no habló
 * (sin voces instaladas, bloqueado…), para avisar en pantalla.
 */
function speak(text: string, lang: Lang): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof speechSynthesis === "undefined") return resolve(false);
    const clean = forSpeech(text);
    const parts = clean.match(/[^.!?¡¿]+[.!?]*|[¡¿][^.!?]+[.!?]*/g)?.map((p) => p.trim()).filter(Boolean) ?? [];
    if (!parts.length) return resolve(true);

    let finished = false;
    let started = false;
    let keepAlive = 0;
    let startCheck = 0;
    let maxTime = 0;
    const finish = (ok: boolean) => {
      if (finished) return;
      finished = true;
      clearInterval(keepAlive);
      clearTimeout(startCheck);
      clearTimeout(maxTime);
      keep.length = 0;
      resolve(ok);
    };

    const run = () => {
      const voice = pickVoice(lang);
      keep.length = 0;
      parts.forEach((p, i) => {
        const u = new SpeechSynthesisUtterance(p);
        u.lang = voice?.lang ?? (lang === "en" ? "en-US" : "es-US");
        if (voice) u.voice = voice;
        u.rate = 1;
        u.volume = 1;
        u.onstart = () => (started = true);
        if (i === parts.length - 1) u.onend = () => finish(true);
        u.onerror = (e) => finish(e.error === "interrupted" || e.error === "canceled" ? true : started);
        keep.push(u);
        speechSynthesis.speak(u);
      });
      speechSynthesis.resume(); // a veces Chrome queda en pausa
      // Chrome en computadora se corta tras ~15 s hablando: se le da un empujón
      if (!isAndroid())
        keepAlive = window.setInterval(() => {
          if (speechSynthesis.speaking) {
            speechSynthesis.pause();
            speechSynthesis.resume();
          }
        }, 10000);
      // Si en 4 s no empezó a hablar, este navegador no puede leer en voz alta
      startCheck = window.setTimeout(() => {
        if (!started && !speechSynthesis.speaking) {
          speechSynthesis.cancel();
          finish(false);
        }
      }, 4000);
      maxTime = window.setTimeout(() => finish(started), 8000 + clean.length * 130);
    };

    // Hablar justo después de cancelar hace que Chrome se trague el texto: se espera un poco
    if (speechSynthesis.speaking || speechSynthesis.pending) {
      speechSynthesis.cancel();
      setTimeout(run, 150);
    } else run();
  });
}

// ---------- voz generada en el navegador (respaldo) ----------
// Algunas computadoras (por ejemplo Chrome en Linux) no traen voces o «hablan» sin sonido.
// Para que Ramoncito se oiga SIEMPRE, ahí se usa Piper: un modelo de voz abierto que corre
// dentro del navegador (librería vits-web). Se descarga una sola vez (~63 MB) y queda guardado.

type Tts = {
  download: (voiceId: string, cb?: (p: { loaded: number; total: number }) => void) => Promise<void>;
  predict: (cfg: { text: string; voiceId: string }) => Promise<Blob>;
};
const VITS_URL = "https://cdn.jsdelivr.net/npm/@diffusionstudio/vits-web@1.0.3/+esm";
const PIPER_VOICE: Record<Lang, string> = { es: "es_MX-claude-high", en: "en_US-hfc_female-medium" };
const SILENT_WAV = "data:audio/wav;base64,UklGRmQGAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YUAGAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

let engine: "device" | "piper" = "device";
let player: HTMLAudioElement | null = null;
let ttsLib: Promise<Tts> | null = null;
const piperReady: Partial<Record<Lang, Promise<boolean>>> = {};
let speakToken = 0; // cambia al interrumpir: corta lo que se esté leyendo

const emitProgress = (pct: number | null) =>
  window.dispatchEvent(new CustomEvent("ramoncito-voz-progreso", { detail: pct }));

function loadPiper(lang: Lang): Promise<boolean> {
  piperReady[lang] ??= (async () => {
    try {
      ttsLib ??= import(/* webpackIgnore: true */ VITS_URL) as Promise<Tts>;
      const tts = await ttsLib;
      emitProgress(0);
      // Hasta 3 intentos: una red lenta o un corte no deben dejar a Ramoncito mudo
      for (let attempt = 1; ; attempt++) {
        try {
          await tts.download(PIPER_VOICE[lang], (p) => p.total && emitProgress(Math.round((p.loaded / p.total) * 100)));
          break;
        } catch (e) {
          console.warn("Voz de Ramoncito: intento", attempt, "falló", e);
          if (attempt >= 3) throw e;
          await new Promise((r) => setTimeout(r, 1500 * attempt));
        }
      }
      emitProgress(null);
      return true;
    } catch (e) {
      console.warn("Voz de Ramoncito: no se pudo preparar", e);
      emitProgress(null);
      ttsLib = null;
      delete piperReady[lang];
      return false;
    }
  })();
  return piperReady[lang]!;
}

/** Lee con Piper: genera la frase siguiente mientras suena la actual */
async function speakPiper(text: string, lang: Lang): Promise<boolean> {
  const token = ++speakToken;
  if (!(await loadPiper(lang)) || token !== speakToken) return false;
  const tts = await ttsLib!;
  const parts = forSpeech(text).match(/[^.!?¡¿]+[.!?]*|[¡¿][^.!?]+[.!?]*/g)?.map((p) => p.trim()).filter(Boolean) ?? [];
  if (!parts.length) return true;
  player ??= new Audio();
  try {
    let next = tts.predict({ text: parts[0], voiceId: PIPER_VOICE[lang] });
    for (let i = 0; i < parts.length; i++) {
      const blob = await next;
      if (token !== speakToken) return true;
      if (i + 1 < parts.length) next = tts.predict({ text: parts[i + 1], voiceId: PIPER_VOICE[lang] });
      const url = URL.createObjectURL(blob);
      player.src = url;
      // false si el navegador no dejó reproducir el sonido (por ejemplo, reproducción automática bloqueada)
      const played = await new Promise<boolean>((resolve) => {
        let ok = true;
        const end = () => {
          clearInterval(watch);
          URL.revokeObjectURL(url);
          resolve(ok);
        };
        const watch = window.setInterval(() => token !== speakToken && (player!.pause(), end()), 150);
        player!.onended = end;
        player!.onerror = () => {
          ok = false;
          end();
        };
        player!.play().catch((e) => {
          console.warn("Voz de Ramoncito: el navegador no dejó reproducir el audio", e);
          ok = false;
          end();
        });
      });
      if (token !== speakToken) return true;
      if (!played) return false;
    }
    return true;
  } catch {
    return false;
  }
}

/** Chrome en una computadora Linux: sus voces suelen fallar sin avisar */
const isLinuxDesktop = () => /Linux/.test(navigator.userAgent) && !/Android|CrOS/.test(navigator.userAgent);

/** Habla con el motor elegido; si la voz del aparato falla, pasa a Piper */
async function speakAny(text: string, lang: Lang): Promise<boolean> {
  if (engine === "piper") return speakPiper(text, lang);
  const ok = await speak(text, lang);
  if (ok) return true;
  engine = "piper";
  return speakPiper(text, lang);
}

/** Corta lo que Ramoncito esté diciendo (botón «Hablar yo» o colgar) */
function stopSpeaking() {
  speakToken++;
  if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
  player?.pause();
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
  // Desbloquea el reproductor de audio con un sonido mudo (lo necesita Piper)
  player ??= new Audio();
  player.src = SILENT_WAV;
  player.play().catch(() => {});

  const greeting =
    lang === "en" ? "Hi, this is Ramoncito. I'm listening: tell me how I can help." : "¡Hola! Soy Ramoncito. Te escucho: dime en qué te ayudo.";
  const hasVoice = typeof speechSynthesis !== "undefined" && (speechSynthesis.getVoices().length === 0 || !!pickVoice(lang));
  engine = isLinuxDesktop() || !hasVoice ? "piper" : "device";
  greetingDone = speakAny(greeting, lang);
}

export const callSupported = () =>
  typeof window !== "undefined" &&
  !!navigator.mediaDevices?.getUserMedia &&
  typeof MediaRecorder !== "undefined";

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
  const [noVoice, setNoVoice] = useState(false);

  const alive = useRef(true);
  const stream = useRef<MediaStream | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const raf = useRef(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
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

  // El micrófono se abre solo para escuchar y se cierra mientras Ramoncito habla: con el
  // micrófono abierto, los teléfonos (sobre todo iPhone) mandan el sonido al auricular de
  // llamada y casi no se oye.
  const releaseMic = () => {
    sourceRef.current?.disconnect();
    sourceRef.current = null;
    analyserRef.current = null;
    stream.current?.getTracks().forEach((tr) => tr.stop());
    stream.current = null;
  };

  const openMic = useCallback(async () => {
    if (stream.current?.getAudioTracks().some((tr) => tr.readyState === "live")) return true;
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    } catch {
      setError(
        t(
          "Necesito permiso para usar el micrófono. Actívalo en tu navegador y vuelve a llamar.",
          "I need permission to use the microphone. Allow it in your browser and call again.",
        ),
      );
      setPhase("error");
      return false;
    }
    if (audioCtx) {
      try {
        void audioCtx.resume();
        const src = audioCtx.createMediaStreamSource(stream.current);
        const an = audioCtx.createAnalyser();
        an.fftSize = 1024;
        src.connect(an);
        sourceRef.current = src;
        analyserRef.current = an;
      } catch {
        analyserRef.current = null;
      }
    }
    return true;
  }, [t]);

  const say = useCallback(async (text: string) => {
    if (!alive.current) return;
    releaseMic();
    setPhase("speaking");
    const ok = await speakAny(text, langRef.current);
    if (!ok) setNoVoice(true);
  }, []);

  // Un turno: escuchar → transcribir → preguntar → hablar → (otro turno)
  const listen = useCallback(async () => {
    if (!alive.current) return;
    if (mutedRef.current) return setPhase("muted");
    if (!(await openMic()) || !stream.current || !alive.current) return;
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
  }, [ask, onHangUp, say, openMic]);

  // Empezar: esperar el saludo de Ramoncito y escuchar
  useEffect(() => {
    alive.current = true;
    (async () => {
      setPhase("speaking");
      const ok = await greetingDone;
      if (!ok) setNoVoice(true);
      listen();
    })();
    return () => {
      alive.current = false;
      cancelAnimationFrame(raf.current);
      if (recorder.current && recorder.current.state !== "inactive") recorder.current.stop();
      releaseMic();
      stopSpeaking();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Progreso de la descarga de la voz (solo la primera vez, en aparatos sin voz propia)
  const [voicePct, setVoicePct] = useState<number | null>(null);
  useEffect(() => {
    const on = (e: Event) => setVoicePct((e as CustomEvent<number | null>).detail);
    window.addEventListener("ramoncito-voz-progreso", on);
    return () => window.removeEventListener("ramoncito-voz-progreso", on);
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
      setTimeout(releaseMic, 300); // después de que se cierre la grabación
      setPhase((p) => (p === "listening" || p === "hearing" ? "muted" : p));
    } else if (phase === "muted") listen();
  };

  // Cortar a Ramoncito mientras habla para hablar uno
  const interrupt = () => stopSpeaking();

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
        {voicePct != null
          ? t(`Preparando la voz de Ramoncito… ${voicePct} %`, `Getting Ramoncito's voice ready… ${voicePct}%`)
          : STATUS[phase]}
      </p>
      {voicePct != null && (
        <p className="rcCallHint">
          {t(
            "Solo la primera vez en este aparato. Después contesta enseguida.",
            "Only the first time on this device. After that it answers right away.",
          )}
        </p>
      )}

      {noVoice && !error && (
        <p className="rcCallError">
          {t(
            "Este navegador no deja que Ramoncito hable en voz alta. Permite el sonido para este sitio (en Brave: el ícono del candado o del escudo junto a la dirección → Reproducción automática → Permitir) y vuelve a llamar. Mientras, lee las respuestas aquí abajo.",
            "This browser isn't letting Ramoncito speak aloud. Allow sound for this site (in Brave: the lock or shield icon next to the address → Autoplay → Allow) and call again. Meanwhile, read the answers below.",
          )}
        </p>
      )}
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
