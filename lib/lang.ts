// Partes del sistema de idiomas que sirven tanto en el servidor como en el navegador.

export type Lang = "en" | "es";
export const LANG_COOKIE = "lang";
export const DEFAULT_LANG: Lang = "en";

export const pick = (lang: Lang) => (es: string, en: string) => (lang === "en" ? en : es);
export const asLang = (v: string | undefined | null): Lang => (v === "es" ? "es" : DEFAULT_LANG);
export const locale = (lang: Lang) => (lang === "en" ? "en-US" : "es-DO");

// ---------- traducción de los datos que vienen en español ----------

export const MONTHS_ES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_EN_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MONTHS_ES_LONG = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/** «Oct» (como viene en los datos) → «Oct» u «Oct» en inglés */
export const month = (lang: Lang, es: string) => {
  const i = MONTHS_ES.indexOf(es);
  return i < 0 || lang === "es" ? es : MONTHS_EN[i];
};
export const monthByIndex = (lang: Lang, i: number) => (lang === "en" ? MONTHS_EN : MONTHS_ES)[i];
export const monthLong = (lang: Lang, i: number) => (lang === "en" ? MONTHS_EN_LONG : MONTHS_ES_LONG)[i];

const CROPS_EN: Record<string, string> = {
  Maíz: "Corn",
  Arroz: "Rice",
  Sorgo: "Sorghum",
  Habichuela: "Beans",
  Maní: "Peanut",
  Guandul: "Pigeon pea",
  Yuca: "Cassava",
  Batata: "Sweet potato",
  Cacao: "Cocoa",
  Plátano: "Plantain",
};
export const crop = (lang: Lang, es: string) => (lang === "en" ? (CROPS_EN[es] ?? es) : es);

const SOILS_EN: Record<string, string> = {
  Arcilla: "Clay",
  "Franco arcilloso": "Clay loam",
  Franco: "Loam",
  "Franco arenoso": "Sandy loam",
  Arena: "Sand",
  "Franco limoso": "Silt loam",
  "Arcillo limoso": "Silty clay",
  "Arcillo arenoso": "Sandy clay",
};
export const soil = (lang: Lang, es: string) => (lang === "en" ? (SOILS_EN[es] ?? es) : es);

/** «11 km de Mao» → «11 km from Mao» */
export const zoneName = (lang: Lang, es: string) =>
  lang === "en" ? es.replace(/^(\d+) km de (.+)$/, "$1 km from $2") : es;

const cropsIn = (s: string) => s.replace(/\b(Maíz|Arroz|Sorgo|Habichuela|Maní|Guandul|Yuca|Batata|Cacao|Plátano)\b/g, (m) => CROPS_EN[m] ?? m);
const monthsIn = (s: string) =>
  s.replace(/\b(Ene|Feb|Mar|Abr|May|Jun|Jul|Ago|Sep|Oct|Nov|Dic)\b/g, (m) => MONTHS_EN[MONTHS_ES.indexOf(m)]);

/** Avisos e indicadores generados por build-data.mjs (plantillas fijas en español) */
export function dataText(lang: Lang, es: string): string {
  if (lang === "es") return es;
  const rules: [RegExp, string][] = [
    [/^(.+): buena ventana de siembra en (\w+) \(cosecha ~(\w+)\)\. Riego de apoyo estimado: (\d+) mm por ciclo\.$/,
      "$1: good sowing window in $2 (harvest ~$3). Estimated supplemental irrigation: $4 mm per cycle."],
    [/^(.+): viable con riego\. Sembrando en (\w+) necesitaría ~(\d+) mm de riego por ciclo\.$/,
      "$1: viable with irrigation. Sowing in $2 it would need ~$3 mm of irrigation per cycle."],
    [/^(.+): mejoró su aptitud entre (.+) y (.+) \((.+) → (.+)\)\.$/, "$1: suitability improved between $2 and $3 ($4 → $5)."],
    [/^(.+): perdió aptitud entre (.+) y (.+) \((.+) → (.+)\)\.$/, "$1: lost suitability between $2 and $3 ($4 → $5)."],
    [/^(.+): según NASA NEX-GDDP-CMIP6 \((.+), emisiones intermedias \(SSP2-4\.5\)\) bajaría de (.+) a (.+)\.$/,
      "$1: according to NASA NEX-GDDP-CMIP6 ($2, intermediate emissions, SSP2-4.5) it would drop from $3 to $4."],
    [/^(.+): según NASA NEX-GDDP-CMIP6 \((.+), emisiones intermedias \(SSP2-4\.5\)\) subiría de (.+) a (.+)\.$/,
      "$1: according to NASA NEX-GDDP-CMIP6 ($2, intermediate emissions, SSP2-4.5) it would rise from $3 to $4."],
    [/^Hacia (.+) \(emisiones intermedias \(SSP2-4\.5\)\): (.+) °C, lluvia (.+)% y (\d+) días\/año sobre (\d+) °C \(hoy (\d+)\)\.$/,
      "By $1 (intermediate emissions, SSP2-4.5): $2 °C, rainfall $3% and $4 days/year above $5 °C (today $6)."],
    [/^Meses con más estrés térmico: (.+)\. Evita que la floración caiga en esos meses\.$/,
      "Months with the most heat stress: $1. Avoid flowering in those months."],
    [/^Meses con más lluvias extremas: (.+)\. Prioriza drenaje y evita cosechar en esas fechas\.$/,
      "Months with the most extreme rain: $1. Prioritize drainage and avoid harvesting then."],
    [/^Las rachas secas se están alargando \((.+) días por década\)\.$/, "Dry spells are getting longer ($1 days per decade)."],
    [/^De (.+) a (.+) meses con vegetación estresada por año; (.+)\.$/, "From $1 to $2 months of stressed vegetation per year; $3."],
    [/^Retiene mucha agua y drena lento: riesgo de encharcamiento y compactación\.$/,
      "Holds a lot of water and drains slowly: risk of waterlogging and compaction."],
    [/^Retiene bastante agua: cuidado con encharcamientos en lluvias fuertes\.$/,
      "Holds plenty of water: watch out for waterlogging after heavy rain."],
  ];
  for (const [re, en] of rules) if (re.test(es)) return monthsIn(cropsIn(es.replace(re, en))).replace("sin tendencia clara", "no clear trend");
  return es;
}
