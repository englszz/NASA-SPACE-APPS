// Lo que guarda cada agricultor sobre su conuco (tabla public.conucos) y textos.

export type Conuco = {
  id?: string;
  user_id?: string;
  nombre: string;
  lat: number;
  lon: number;
  tareas: number | null;
  siembra_actual: string;
  agua: "lluvia" | "riego_aveces" | "riego_siempre";
  prioridades: string[];
  equipo: "manual" | "animal" | "tractor";
  venta: "consumo" | "mercado_local" | "exportacion";
  notas: string | null;
};

export const AGUA: Record<Conuco["agua"], string> = {
  lluvia: "Solo la lluvia",
  riego_aveces: "Riego a veces (canal, pozo o tanque)",
  riego_siempre: "Riego siempre que lo necesito",
};

export const EQUIPO: Record<Conuco["equipo"], string> = {
  manual: "A mano (azada, machete)",
  animal: "Con animales (bueyes, mulos)",
  tractor: "Con tractor",
};

export const VENTA: Record<Conuco["venta"], string> = {
  consumo: "Para mi casa",
  mercado_local: "En el mercado del pueblo",
  exportacion: "A intermediarios o para exportar",
};

// Las prioridades que menciona el reto (FARMERS.docx), en palabras sencillas
export const PRIORIDADES: { id: string; label: string }[] = [
  { id: "agua", label: "Gastar menos agua" },
  { id: "nitrogeno", label: "Abonar la tierra de forma natural" },
  { id: "erosion", label: "Que la lluvia no se lleve la tierra" },
  { id: "organica", label: "Tierra más negra y viva" },
  { id: "forraje", label: "Comida para mis animales" },
  { id: "mercado", label: "Vender bien mi cosecha" },
  { id: "ingreso", label: "Un ingreso extra" },
];

export type ZonePoint = { id: string; lat: number; lon: number; name: string };

const R = 6371;
export function distKm(aLat: number, aLon: number, bLat: number, bLon: number) {
  const r = Math.PI / 180;
  const x =
    Math.sin(((bLat - aLat) * r) / 2) ** 2 +
    Math.cos(aLat * r) * Math.cos(bLat * r) * Math.sin(((bLon - aLon) * r) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

// La zona de análisis más cercana al conuco (los puntos están cada ~11 km)
export function nearestZone<T extends ZonePoint>(points: T[], lat: number, lon: number) {
  let best = points[0];
  let km = Infinity;
  for (const p of points) {
    const d = distKm(lat, lon, p.lat, p.lon);
    if (d < km) {
      km = d;
      best = p;
    }
  }
  return { zone: best, km };
}

// Más lejos que esto, el conuco está fuera del área analizada (el Cibao)
export const MAX_ZONE_KM = 12;
