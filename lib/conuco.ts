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

type L = { es: string; en: string };

export const AGUA: Record<Conuco["agua"], L> = {
  lluvia: { es: "Solo la lluvia", en: "Rain only" },
  riego_aveces: { es: "Riego a veces (canal, pozo o tanque)", en: "Irrigation sometimes (canal, well or tank)" },
  riego_siempre: { es: "Riego siempre que lo necesito", en: "Irrigation whenever I need it" },
};

export const EQUIPO: Record<Conuco["equipo"], L> = {
  manual: { es: "A mano (azada, machete)", en: "By hand (hoe, machete)" },
  animal: { es: "Con animales (bueyes, mulos)", en: "With animals (oxen, mules)" },
  tractor: { es: "Con tractor", en: "With a tractor" },
};

export const VENTA: Record<Conuco["venta"], L> = {
  consumo: { es: "Para mi casa", en: "For my household" },
  mercado_local: { es: "En el mercado del pueblo", en: "At the local market" },
  exportacion: { es: "A intermediarios o para exportar", en: "To middlemen or for export" },
};

// Las prioridades que menciona el reto (FARMERS.docx), en palabras sencillas y con
// una mini descripción (el término técnico va entre paréntesis para aprenderlo)
export const PRIORIDADES: { id: string; label: L; hint: L }[] = [
  {
    id: "agua",
    label: { es: "Usar menos agua", en: "Use less water" },
    hint: { es: "Cultivos que piden poco riego", en: "Crops that need little irrigation" },
  },
  {
    id: "nitrogeno",
    label: { es: "Ayudar a la tierra a tener nutrientes", en: "Help the soil get nutrients" },
    hint: { es: "Leguminosas que abonan solas (fijan nitrógeno)", en: "Legumes that fertilize on their own (they fix nitrogen)" },
  },
  {
    id: "erosion",
    label: { es: "Evitar que la tierra se desgaste", en: "Keep the soil from wearing away" },
    hint: { es: "Tierra cubierta para que la lluvia no se la lleve (erosión)", en: "Covered soil so rain doesn't wash it away (erosion)" },
  },
  {
    id: "organica",
    label: { es: "Restos naturales que ayudan a la tierra", en: "Natural residues that help the soil" },
    hint: { es: "Rastrojo que se vuelve abono (materia orgánica)", en: "Crop residue that turns into compost (organic matter)" },
  },
  {
    id: "forraje",
    label: { es: "Comida para los animales", en: "Food for animals" },
    hint: { es: "Cultivos que también sirven de forraje", en: "Crops that also work as fodder" },
  },
  {
    id: "mercado",
    label: { es: "Vender lo que se produce", en: "Sell what you grow" },
    hint: { es: "Cultivos con buena salida en el mercado", en: "Crops that sell well at market" },
  },
  {
    id: "ingreso",
    label: { es: "Un ingreso extra", en: "Extra income" },
    hint: { es: "Un cultivo más para ganar algo adicional", en: "One more crop to earn something extra" },
  },
];

export const PRIORITY_TEXT: Record<string, { label: L; hint: L }> = Object.fromEntries(PRIORIDADES.map((p) => [p.id, p]));

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
