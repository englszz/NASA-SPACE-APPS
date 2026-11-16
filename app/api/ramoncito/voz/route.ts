// Llamada con Ramoncito: convierte en texto lo que dijo la persona (voz → texto)
// con Whisper en Groq. El audio no se guarda: se envía a Groq solo para transcribirlo.
// La respuesta de Ramoncito la lee en voz alta el propio teléfono (no pasa por aquí).

import { headers } from "next/headers";
import { NextResponse } from "next/server";

const GROQ_STT = "https://api.groq.com/openai/v1/audio/transcriptions";
const STT_MODEL = process.env.GROQ_STT_MODEL || "whisper-large-v3-turbo";
const MAX_BYTES = 3 * 1024 * 1024; // ~30 s de audio comprimido sobran con esto

// Límite por persona para cuidar la cuota gratuita de audio de Groq
const hits = new Map<string, number[]>();
const LIMIT = 40; // audios
const WINDOW = 10 * 60 * 1000; // por 10 minutos

// Whisper a veces «oye» frases típicas de videos cuando solo hay ruido: se descartan
const NOISE = [/amara\.org/i, /suscr[ií]bete/i, /gracias por ver/i, /subt[ií]tulos/i, /thanks? (you )?for watching/i, /^\W*$/];

export async function POST(req: Request) {
  const en = new URL(req.url).searchParams.get("lang") === "en";
  const fail = (es: string, eng: string, status: number) => NextResponse.json({ error: en ? eng : es }, { status });

  if (!process.env.GROQ_API_KEY) return fail("Falta configurar GROQ_API_KEY.", "GROQ_API_KEY is not set.", 503);

  const h = await headers();
  const who = h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "?";
  const now = Date.now();
  const recent = (hits.get(who) ?? []).filter((t) => now - t < WINDOW);
  if (recent.length >= LIMIT)
    return fail("Muchas preguntas seguidas. Espera unos minutos.", "Too many questions in a row. Please wait a few minutes.", 429);
  hits.set(who, [...recent, now]);

  let audio: File | null = null;
  try {
    const form = await req.formData();
    const f = form.get("audio");
    audio = f instanceof File ? f : null;
  } catch {
    audio = null;
  }
  if (!audio || !audio.size) return fail("No llegó el audio.", "No audio received.", 400);
  if (audio.size > MAX_BYTES) return fail("El audio es muy largo.", "The audio is too long.", 413);

  const out = new FormData();
  out.append("file", audio, audio.name || "voz.webm");
  out.append("model", STT_MODEL);
  out.append("language", en ? "en" : "es");
  out.append("response_format", "json");
  out.append("temperature", "0");
  // Pista de vocabulario para que reconozca bien las palabras del campo dominicano
  out.append("prompt", en ? "Conuco, Cibao, guandul, habichuela, yuca, plátano, tareas." : "Conuco, Cibao, guandul, habichuela, yuca, batata, plátano, sorgo, maní, tareas, riego.");

  const r = await fetch(GROQ_STT, { method: "POST", headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` }, body: out });
  if (!r.ok) {
    console.error("Groq STT", r.status, (await r.text().catch(() => "")).slice(0, 300));
    return r.status === 429
      ? fail("Ramoncito está muy ocupado. Intenta en un minuto.", "Ramoncito is very busy. Try again in a minute.", 502)
      : fail("No se pudo entender el audio.", "Couldn't process the audio.", 502);
  }
  const text = String((await r.json()).text ?? "").trim();
  return NextResponse.json({ text: NOISE.some((re) => re.test(text)) && text.length < 80 ? "" : text.slice(0, 1500) });
}
