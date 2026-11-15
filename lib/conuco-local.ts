// «Mi conuco» sin iniciar sesión: los datos del conuco se guardan en una cookie del
// propio navegador. Así Ramoncito puede dar consejos sin cuenta. Si la persona entra
// con Google, se usan los datos de su cuenta (Supabase) en lugar de la cookie.
//
// - La ubicación se redondea a 3 decimales (unos 100 m): basta para escoger la zona de datos.
// - El servidor solo lee la cookie para armar los consejos; no la guarda en ninguna parte.
// - Sirve tanto en el navegador como en el servidor (no importa nada de Next).

import { AGUA, EQUIPO, PRIORIDADES, VENTA, type Conuco } from "./conuco";

export const CONUCO_COOKIE = "mi-conuco";
// Si no existe, es la primera visita: la portada abre el mapa con la animación del granero
export const FIRST_VISIT_COOKIE = "conuco-ya-visito";
const MAX_AGE = 60 * 60 * 24 * 365; // un año

// «Otro» cultivo que no está en la lista: se guarda como «otro:lo que escribió la persona»
export const OTHER_PREFIX = "otro:";
export const isOther = (id: string | null | undefined) => !!id && id.startsWith(OTHER_PREFIX);
export const otherText = (id: string) => id.slice(OTHER_PREFIX.length);
export const cleanCrop = (s: string) => s.replace(/[<>{}\n\r]/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);

const pickKey = <T extends string>(v: unknown, allowed: Record<T, unknown>, fallback: T): T =>
  typeof v === "string" && v in allowed ? (v as T) : fallback;

/** Revisa y limpia lo que viene de la cookie (puede venir alterado): devuelve null si no sirve */
export function sanitizeConuco(raw: unknown): Conuco | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const lat = Number(r.lat);
  const lon = Number(r.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  const nombre = typeof r.nombre === "string" ? r.nombre.trim().slice(0, 80) : "";
  if (!nombre) return null;
  const tareas = Number(r.tareas);
  let siembra = typeof r.siembra_actual === "string" ? r.siembra_actual.slice(0, 80) : "maiz-maiz";
  if (isOther(siembra)) siembra = OTHER_PREFIX + cleanCrop(otherText(siembra));
  const ids = new Set(PRIORIDADES.map((p) => p.id));
  return {
    nombre,
    lat: Math.round(lat * 1000) / 1000,
    lon: Math.round(lon * 1000) / 1000,
    tareas: Number.isFinite(tareas) && tareas > 0 && tareas < 100000 ? tareas : null,
    siembra_actual: siembra || "maiz-maiz",
    agua: pickKey(r.agua, AGUA, "lluvia"),
    prioridades: Array.isArray(r.prioridades) ? r.prioridades.filter((p): p is string => typeof p === "string" && ids.has(p)) : [],
    equipo: pickKey(r.equipo, EQUIPO, "manual"),
    venta: pickKey(r.venta, VENTA, "mercado_local"),
    notas: typeof r.notas === "string" && r.notas.trim() ? r.notas.trim().slice(0, 500) : null,
  };
}

/** Valor de la cookie → conuco (o null) */
export function parseConucoCookie(value: string | undefined | null): Conuco | null {
  if (!value) return null;
  try {
    return sanitizeConuco(JSON.parse(decodeURIComponent(value)));
  } catch {
    return null;
  }
}

// ---------- solo en el navegador ----------

export function readLocalConuco(): Conuco | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp(`(?:^|; )${CONUCO_COOKIE}=([^;]*)`));
  return parseConucoCookie(m?.[1]);
}

export function saveLocalConuco(c: Conuco) {
  const clean = sanitizeConuco(c);
  if (!clean) return false;
  const secure = location.protocol === "https:" ? "; secure" : "";
  document.cookie = `${CONUCO_COOKIE}=${encodeURIComponent(JSON.stringify(clean))}; path=/; max-age=${MAX_AGE}; samesite=lax${secure}`;
  window.dispatchEvent(new Event("conuco-cambio"));
  return true;
}

export function clearLocalConuco() {
  document.cookie = `${CONUCO_COOKIE}=; path=/; max-age=0; samesite=lax`;
  window.dispatchEvent(new Event("conuco-cambio"));
}
