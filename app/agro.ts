// Motor agrícola de la web.
// evaluate() es una copia exacta del método de field-shift-data/build-data.mjs
// (aptitud FAO ECOCROP por mes de siembra). Sobre él se arman las rotaciones por
// zona y el simulador «¿y si llueve menos / hace más calor?».

export const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

export type ClimMonth = {
  t: number;
  p: number;
  et0: number;
  heatDays: number;
  heatDays35: number;
  frostDays: number;
  extremeRainDays: number;
};

export type CropParams = {
  id: string;
  name: string;
  family: "cereal" | "leguminosa" | "raiz" | "perenne";
  cycle: number;
  kc: number;
  tOpt: [number, number];
  tAbs: [number, number];
  rainOpt: [number, number];
  rainAbs: [number, number];
  heatTol: "baja" | "media" | "alta";
  texture: Record<string, number>;
};

export type Model = {
  group: string | null;
  clim: ClimMonth[];
  futures: Record<string, ClimMonth[]>;
  crops: CropParams[];
};

export type Evaluation = {
  sowMonth: number; // 1-12
  harvestMonth: number;
  rainfed: number;
  irrigated: number;
  cycleRainMm: number;
  cropWaterNeedMm: number;
  irrigationMm: number;
  heatDays: number;
};

// ---------- copia de build-data.mjs ----------
const round = (x: number, d = 1) => +x.toFixed(d);
const effRain = (p: number) => (p <= 250 ? (p * (125 - 0.2 * p)) / 125 : 125 + 0.1 * p);

function trap(x: number, opt: [number, number], abs: [number, number]) {
  if (x >= opt[0] && x <= opt[1]) return 1;
  if (x <= abs[0] || x >= abs[1]) return 0;
  return x < opt[0] ? (x - abs[0]) / (opt[0] - abs[0]) : (abs[1] - x) / (abs[1] - opt[1]);
}

export function evaluate(crop: CropParams, clim: ClimMonth[], start: number, group: string | null): Evaluation {
  let tScore = 1, rain = 0, irr = 0, need = 0, heat = 0, heat35 = 0, frost = 0;
  for (let k = 0; k < crop.cycle; k++) {
    const c = clim[(start - 1 + k) % 12];
    tScore = Math.min(tScore, trap(c.t, crop.tOpt, crop.tAbs));
    const etc = crop.kc * c.et0;
    need += etc;
    rain += c.p;
    irr += Math.max(0, etc - effRain(c.p));
    heat += c.heatDays;
    heat35 += c.heatDays35;
    frost += c.frostDays;
  }
  const heatPenalty = Math.min(0.5, (heat35 / (crop.cycle * 30.4)) * { baja: 3, media: 2, alta: 1 }[crop.heatTol]);
  const frostPenalty = frost > 0.5 ? 0.5 : 0;
  const tex = group ? (crop.texture[group] ?? 1) : 1;
  const climate = Math.max(0, tScore - heatPenalty - frostPenalty);
  return {
    sowMonth: start,
    harvestMonth: ((start - 1 + crop.cycle) % 12) + 1,
    rainfed: round(Math.min(climate, trap(rain, crop.rainOpt, crop.rainAbs)) * tex, 2),
    irrigated: round(climate * tex, 2),
    cycleRainMm: Math.round(rain),
    cropWaterNeedMm: Math.round(need),
    irrigationMm: Math.round(irr),
    heatDays: round(heat, 1),
  };
}

export const bestFor = (crop: CropParams, clim: ClimMonth[], group: string | null) =>
  Array.from({ length: 12 }, (_, i) => evaluate(crop, clim, i + 1, group)).reduce((a, b) =>
    b.rainfed > a.rainfed || (b.rainfed === a.rainfed && b.irrigationMm < a.irrigationMm) ? b : a,
  );

// ---------- simulador «¿y si…?» ----------
// Lluvia: se multiplica. Temperatura: se suma; la evaporación sube con la fórmula de
// Hargreaves (proporcional a t + 17.8) y los días sobre 32/35 °C se interpolan con la
// relación calor/temperatura del escenario más cálido de los modelos de la NASA.
export function adjustClimate(model: Model, rainPct: number, dT: number): ClimMonth[] {
  const hot = model.futures["ssp585_2041-2060"] ?? Object.values(model.futures).at(-1);
  return model.clim.map((c, i) => {
    const f = hot?.[i];
    const dTf = f ? f.t - c.t : 0;
    const k = dTf > 0.1 ? dT / dTf : 0;
    const lerp = (a: number, b: number) => Math.max(0, Math.min(30.4, a + (b - a) * k));
    return {
      ...c,
      t: c.t + dT,
      p: c.p * (1 + rainPct / 100),
      et0: c.et0 * ((c.t + dT + 17.8) / (c.t + 17.8)),
      heatDays: f ? lerp(c.heatDays, f.heatDays) : c.heatDays,
      heatDays35: f ? lerp(c.heatDays35, f.heatDays35) : c.heatDays35,
    };
  });
}

// ---------- rotaciones ----------
export type Placement = { crop: CropParams; ev: Evaluation; start: number }; // start 1-12
export type Rotation = {
  id: string;
  name: string;
  tagline: string;
  placements: Placement[];
  calendar: (Placement | null)[]; // 12 meses: qué cultivo ocupa cada mes
  avgRainfed: number;
  minRainfed: number;
  irrigationMm: number;
  bareMonths: number[]; // índices 0-11
  bareRainyMonths: number[]; // meses desnudos con lluvia fuerte (riesgo de erosión)
  hardMonths: { month: number; why: string }[]; // meses con cultivo en apuros
  hasLegume: boolean;
  families: string[];
  future: number | null; // aptitud media con el clima 2041-2060 (SSP2-4.5)
};

const RAINY_MM = 150; // mes con lluvia fuerte para el riesgo de erosión

function buildRotation(
  id: string,
  name: string,
  tagline: string,
  placements: Placement[],
  clim: ClimMonth[],
  future: ClimMonth[] | null,
  group: string | null,
): Rotation {
  const calendar: (Placement | null)[] = Array(12).fill(null);
  for (const pl of placements)
    for (let k = 0; k < pl.crop.cycle; k++) {
      const m = (pl.start - 1 + k) % 12;
      if (!calendar[m]) calendar[m] = pl;
    }
  const bareMonths = calendar.map((c, i) => (c ? -1 : i)).filter((i) => i >= 0);
  const hardMonths: { month: number; why: string }[] = [];
  calendar.forEach((pl, i) => {
    if (!pl) return;
    const c = clim[i];
    const need = pl.crop.kc * c.et0;
    if (c.heatDays35 >= 5 && pl.crop.heatTol !== "alta") hardMonths.push({ month: i, why: "calor fuerte" });
    else if (effRain(c.p) < need * 0.5) hardMonths.push({ month: i, why: "falta agua" });
    else if (c.extremeRainDays >= 0.5) hardMonths.push({ month: i, why: "aguaceros" });
  });
  const months = placements.reduce((s, p) => s + p.crop.cycle, 0) || 1;
  const fut = future
    ? placements.reduce((s, p) => s + evaluate(p.crop, future, p.start, group).rainfed * p.crop.cycle, 0) / months
    : null;
  return {
    id,
    name,
    tagline,
    placements,
    calendar,
    avgRainfed: placements.reduce((s, p) => s + p.ev.rainfed * p.crop.cycle, 0) / months,
    minRainfed: Math.min(...placements.map((p) => p.ev.rainfed)),
    irrigationMm: placements.reduce((s, p) => s + p.ev.irrigationMm, 0),
    bareMonths,
    bareRainyMonths: bareMonths.filter((i) => clim[i].p >= RAINY_MM),
    hardMonths,
    hasLegume: placements.some((p) => p.crop.family === "leguminosa"),
    families: [...new Set(placements.map((p) => p.crop.family))],
    future: fut,
  };
}

// Todas las secuencias de 1 a 3 cultivos anuales que caben en 12 meses, sin repetir
// familia seguida (eso es lo que hace que sea una rotación).
function candidateSequences(model: Model, clim: ClimMonth[], minRainfed = 0.45) {
  const annual = model.crops.filter((c) => c.family !== "perenne" && c.cycle <= 6);
  const evals = new Map<string, Evaluation[]>();
  for (const c of annual) evals.set(c.id, Array.from({ length: 12 }, (_, i) => evaluate(c, clim, i + 1, model.group)));
  const out: Placement[][] = [];
  const extend = (seq: Placement[], used: number) => {
    if (seq.length) out.push(seq);
    if (seq.length === 3) return;
    const last = seq.at(-1);
    for (const c of annual) {
      if (last && (c.family === last.crop.family || seq.some((s) => s.crop.id === c.id))) continue;
      for (const gap of last ? [0, 1] : [0]) {
        const starts = last ? [((last.start - 1 + last.crop.cycle + gap) % 12) + 1] : Array.from({ length: 12 }, (_, i) => i + 1);
        for (const start of starts) {
          if (used + gap + c.cycle > 12) continue;
          const ev = evals.get(c.id)![start - 1];
          if (ev.rainfed < minRainfed) continue; // solo cultivos que se dan con la lluvia y el calor de esa época
          extend([...seq, { crop: c, ev, start }], used + gap + c.cycle);
        }
      }
    }
  };
  extend([], 0);
  return out;
}

// Rotación «de hoy»: lo que el agricultor dice que siembra
export const CURRENT_PRESETS: { id: string; label: string; en: string; crops: string[] }[] = [
  { id: "maiz-maiz", label: "Maíz, dos veces al año", en: "Corn, twice a year", crops: ["maiz", "maiz"] },
  { id: "arroz-arroz", label: "Arroz, dos veces al año", en: "Rice, twice a year", crops: ["arroz", "arroz"] },
  { id: "maiz-habichuela", label: "Maíz y luego habichuela", en: "Corn, then beans", crops: ["maiz", "habichuela"] },
  { id: "yuca", label: "Solo yuca", en: "Cassava only", crops: ["yuca"] },
  { id: "platano", label: "Plátano (todo el año)", en: "Plantain (year-round)", crops: ["platano"] },
  { id: "cacao", label: "Cacao (todo el año)", en: "Cocoa (year-round)", crops: ["cacao"] },
];

function currentRotation(model: Model, clim: ClimMonth[], presetId: string): Placement[] {
  const preset = CURRENT_PRESETS.find((p) => p.id === presetId) ?? CURRENT_PRESETS[0];
  const crops = preset.crops.map((id) => model.crops.find((c) => c.id === id)!).filter(Boolean);
  // El primer cultivo en su mejor mes; los siguientes justo después de la cosecha anterior
  let start = bestFor(crops[0], clim, model.group).sowMonth;
  return crops.map((crop) => {
    const pl = { crop, ev: evaluate(crop, clim, start, model.group), start };
    start = ((start - 1 + crop.cycle) % 12) + 1;
    return pl;
  });
}

export function rotationsFor(model: Model, presetId: string, clim: ClimMonth[] = model.clim) {
  const future = model.futures["ssp245_2041-2060"] ?? null;
  // En zonas muy calientes pocos cultivos pasan el mínimo: se afloja poco a poco hasta tener
  // al menos 2 alternativas distintas (las débiles quedan marcadas como «Regular» o «Difícil»).
  let all: Rotation[] = [];
  for (const min of [0.45, 0.3, 0.15, 0]) {
    all = candidateSequences(model, clim, min).map((seq, i) => buildRotation(`c${i}`, "", "", seq, clim, future, model.group));
    const combos = new Set(all.filter((r) => r.placements.length >= 2).map((r) => r.placements.map((p) => p.crop.id).sort().join(",")));
    if (combos.size >= 3) break;
  }
  // Cada estrategia debe usar una combinación de cultivos distinta (no solo otras fechas)
  const sig = (r: { placements: Placement[] } | Placement[]) =>
    (Array.isArray(r) ? r : r.placements).map((p) => p.crop.id).sort().join(",");
  const pick = (list: Rotation[], score: (r: Rotation) => number, taken: Set<string>) =>
    [...list].sort((a, b) => score(b) - score(a)).find((r) => !taken.has(sig(r)));

  const taken = new Set<string>();
  const result: Rotation[] = [];
  const cur = currentRotation(model, clim, presetId);
  result.push(buildRotation("actual", "Lo que siembras hoy", "Tu punto de partida", cur, clim, future, model.group));
  taken.add(sig(cur));

  const soil = pick(
    all.filter((r) => r.hasLegume && r.placements.length >= 2),
    (r) => r.avgRainfed - r.bareMonths.length * 0.06 - r.bareRainyMonths.length * 0.08 + r.families.length * 0.05,
    taken,
  );
  if (soil) taken.add(sig(soil));
  const water = pick(
    all.filter((r) => r.placements.length >= 2),
    (r) => r.avgRainfed * 1.2 + r.minRainfed * 0.5 - r.irrigationMm / 600 - r.bareMonths.length * 0.03,
    taken,
  );
  if (water) taken.add(sig(water));
  const future_ = pick(
    all.filter((r) => r.placements.length >= 2 && r.future != null),
    (r) => (r.future ?? 0) * 1.5 + r.avgRainfed * 0.5 - r.bareMonths.length * 0.03,
    taken,
  );

  // Cada alternativa se llama por sus cultivos; lo que la hace especial lo dicen las
  // insignias, calculadas comparando todas las opciones (así nada promete de más).
  const seen = new Set<string>();
  for (const r of [soil, water, future_]) {
    if (!r || seen.has(sig(r))) continue;
    seen.add(sig(r));
    const names = r.placements.map((p) => p.crop.name);
    const name = names.length > 1 ? `${names.slice(0, -1).join(", ")} y ${names.at(-1)!.toLowerCase()}` : names[0];
    result.push({ ...r, id: sig(r), name, tagline: "" });
  }
  return withBadges(result);
}

export type Badge = { id: string; label: string };

function withBadges(rots: Rotation[]): (Rotation & { badges: Badge[] })[] {
  const alts = rots.slice(1);
  const best = (f: (r: Rotation) => number, min = true) => {
    const vals = rots.map(f);
    const target = min ? Math.min(...vals) : Math.max(...vals);
    // solo se premia si de verdad se distingue de lo que siembras hoy
    return (r: Rotation) => Math.abs(f(r) - target) < 1e-9 && Math.abs(f(rots[0]) - target) > 1e-9;
  };
  const isFut = best((r) => r.future ?? 0, false);
  const isRain = best((r) => +r.avgRainfed.toFixed(2), false);
  const isIrr = best((r) => r.irrigationMm);
  const isBare = best((r) => r.bareMonths.length * 10 + r.bareRainyMonths.length);
  return rots.map((r, i) => {
    const badges: Badge[] = [];
    if (i > 0 || alts.length === 0) {
      if (isFut(r)) badges.push({ id: "futuro", label: "La mejor para el futuro" });
      if (isRain(r)) badges.push({ id: "lluvia", label: "Rinde más con la lluvia" });
      if (isIrr(r)) badges.push({ id: "riego", label: "Menos riego" });
      if (isBare(r)) badges.push({ id: "suelo", label: "Menos tierra desnuda" });
      if (r.hasLegume) badges.push({ id: "nitrogeno", label: "Da nutrientes a la tierra" });
    }
    return { ...r, badges };
  });
}

// Meses del año en esta zona: lluvia, calor y si falta agua (para el calendario)
export const monthNotes = (clim: ClimMonth[]) =>
  clim.map((c) => ({
    rainy: c.p >= RAINY_MM,
    hot: c.heatDays35 >= 5,
    dry: effRain(c.p) < c.et0 * 0.5,
  }));
