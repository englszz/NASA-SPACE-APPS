// Guarda una opinión (feedback) de la portada en la tabla public.opiniones de Supabase.
// - La tabla solo permite insertar (ver supabase/opiniones.sql): nadie puede leerlas desde la web.
// - No se guarda el nombre, el correo ni la IP de quien escribe.
// - Freno sencillo contra spam: pocas opiniones por IP y un campo trampa oculto.

import { createClient } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

const QUIEN = ["agricultor", "tecnico", "juez", "estudiante", "otro"];
const hits = new Map<string, number[]>();
const LIMIT = 5; // opiniones
const WINDOW = 60 * 60 * 1000; // por hora

export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.json({ error: "noconfig" }, { status: 503 });

  let b: { quien?: unknown; calificacion?: unknown; mensaje?: unknown; idioma?: unknown; web?: unknown };
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "bad" }, { status: 400 });
  }
  // Campo trampa: las personas no lo ven; si viene lleno, es un robot. Se responde «ok» sin guardar.
  if (typeof b.web === "string" && b.web) return NextResponse.json({ ok: true });

  const mensaje = typeof b.mensaje === "string" ? b.mensaje.trim().slice(0, 1000) : "";
  if (!mensaje) return NextResponse.json({ error: "empty" }, { status: 400 });
  const quien = typeof b.quien === "string" && QUIEN.includes(b.quien) ? b.quien : "otro";
  const cal = Number(b.calificacion);
  const calificacion = Number.isInteger(cal) && cal >= 1 && cal <= 5 ? cal : null;
  const idioma = b.idioma === "en" ? "en" : "es";

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "?";
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW);
  if (recent.length >= LIMIT) return NextResponse.json({ error: "rate" }, { status: 429 });
  hits.set(ip, [...recent, now]);

  const sb = createClient(url, key, { auth: { persistSession: false } });
  const { error } = await sb.from("opiniones").insert({ quien, calificacion, mensaje, idioma });
  if (error) {
    console.error("opiniones", error.code, error.message);
    return NextResponse.json({ error: "save" }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
