// FIELD SHIFT - Generador de datos (UNA región, 8 indicadores del reto)
// Uso:  node build-data.mjs        (Node 18+, sin dependencias)
//
// Entradas opcionales en esta carpeta:
//   soil.json            -> consola de gee-region.js
//   fieldshift_gee.csv   -> export de gee-region.js (NDVI, ET MODIS, SMAP, GRACE)
//   fieldshift_cmip6.csv -> export de gee-cmip6.js (proyección futura)
// Salida:
//   data/region.json  (cópialo a /public/data de tu Next.js)

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

// ---------------------------------------------------------------------------
// 1. CONFIGURACIÓN (cambia aquí la región si quieres otra)
// ---------------------------------------------------------------------------
let REGION = { id: "cibao", name: "Valle del Cibao", country: "República Dominicana", lat: 19.25, lon: -70.5 };
const START_YEAR = 2006;
const END_YEAR = 2025; // 20 años completos

// Umbrales de los indicadores
const HEAT_MODERATE = 32; // °C, temperatura máxima diaria
const HEAT_SEVERE = 35;
const FROST = 0;          // °C, temperatura mínima diaria
const NEAR_FROST = 2;
const EXTREME_RAIN = 50;  // mm en un día
const DRY_DAY = 1;        // mm, por debajo es día seco

const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const DAYS = [31, 28.25, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

// ---------------------------------------------------------------------------
// 2. CULTIVOS (valores APROXIMADOS de FAO ECOCROP y Kc de FAO-56; verificar)
// ---------------------------------------------------------------------------
const CROPS = [
  { id: "maiz", name: "Maíz", family: "cereal", cycle: 4, kc: 0.9, tOpt: [18, 33], tAbs: [10, 40], rainOpt: [500, 1000], rainAbs: [300, 1600], heatTol: "media",
    texture: { arenoso: 0.5, "franco-arenoso": 0.85, franco: 1, "franco-arcilloso": 0.9, arcilloso: 0.6 } },
  { id: "habichuela", name: "Habichuela", family: "leguminosa", cycle: 3, kc: 0.85, tOpt: [16, 26], tAbs: [8, 32], rainOpt: [300, 500], rainAbs: [200, 900], heatTol: "baja",
    texture: { arenoso: 0.5, "franco-arenoso": 0.9, franco: 1, "franco-arcilloso": 0.75, arcilloso: 0.4 } },
  { id: "mani", name: "Maní", family: "leguminosa", cycle: 4, kc: 0.85, tOpt: [22, 32], tAbs: [12, 40], rainOpt: [450, 900], rainAbs: [300, 1400], heatTol: "alta",
    texture: { arenoso: 0.85, "franco-arenoso": 1, franco: 0.85, "franco-arcilloso": 0.5, arcilloso: 0.25 } },
  { id: "yuca", name: "Yuca", family: "raiz", cycle: 10, kc: 0.8, tOpt: [20, 29], tAbs: [12, 35], rainOpt: [800, 1500], rainAbs: [500, 3000], heatTol: "alta",
    texture: { arenoso: 0.7, "franco-arenoso": 1, franco: 1, "franco-arcilloso": 0.7, arcilloso: 0.35 } },
  { id: "batata", name: "Batata", family: "raiz", cycle: 5, kc: 0.85, tOpt: [20, 30], tAbs: [12, 35], rainOpt: [500, 1000], rainAbs: [350, 1600], heatTol: "media",
    texture: { arenoso: 0.75, "franco-arenoso": 1, franco: 0.95, "franco-arcilloso": 0.6, arcilloso: 0.3 } },
  { id: "arroz", name: "Arroz", family: "cereal", cycle: 4, kc: 1.1, tOpt: [20, 33], tAbs: [12, 38], rainOpt: [800, 1600], rainAbs: [500, 2500], heatTol: "media",
    texture: { arenoso: 0.2, "franco-arenoso": 0.4, franco: 0.7, "franco-arcilloso": 0.95, arcilloso: 1 } },
  { id: "sorgo", name: "Sorgo", family: "cereal", cycle: 4, kc: 0.8, tOpt: [22, 34], tAbs: [10, 40], rainOpt: [350, 700], rainAbs: [250, 1200], heatTol: "alta",
    texture: { arenoso: 0.6, "franco-arenoso": 0.85, franco: 1, "franco-arcilloso": 1, arcilloso: 0.8 } },
  { id: "cacao", name: "Cacao", family: "perenne", cycle: 12, kc: 1.0, tOpt: [21, 32], tAbs: [10, 38], rainOpt: [1500, 2500], rainAbs: [1000, 4000], heatTol: "media",
    texture: { arenoso: 0.3, "franco-arenoso": 0.7, franco: 1, "franco-arcilloso": 0.9, arcilloso: 0.6 } },
  { id: "guandul", name: "Guandul", family: "leguminosa", cycle: 6, kc: 0.8, tOpt: [18, 30], tAbs: [10, 35], rainOpt: [600, 1000], rainAbs: [400, 2500], heatTol: "alta",
    texture: { arenoso: 0.6, "franco-arenoso": 0.9, franco: 1, "franco-arcilloso": 0.85, arcilloso: 0.6 } },
  { id: "platano", name: "Plátano", family: "perenne", cycle: 12, kc: 1.0, tOpt: [24, 30], tAbs: [14, 38], rainOpt: [1500, 2500], rainAbs: [1000, 4000], heatTol: "media",
    texture: { arenoso: 0.4, "franco-arenoso": 0.8, franco: 1, "franco-arcilloso": 0.9, arcilloso: 0.5 } },
];

// ---------------------------------------------------------------------------
// 3. NASA POWER (diario, con caché)
// GWETROOT / GWETTOP = humedad del suelo zona radicular / superficial (0 a 1), MERRA-2
// ---------------------------------------------------------------------------
export async function fetchPower(reg = REGION, key = reg.id) {
  fs.mkdirSync("cache", { recursive: true });
  const cacheFile = path.join("cache", `power_${key}_${START_YEAR}_${END_YEAR}.json`);
  if (fs.existsSync(cacheFile)) return JSON.parse(fs.readFileSync(cacheFile, "utf8"));
  const url =
    "https://power.larc.nasa.gov/api/temporal/daily/point" +
    "?parameters=T2M,T2M_MAX,T2M_MIN,PRECTOTCORR,GWETROOT,GWETTOP&community=AG" +
    `&latitude=${reg.lat}&longitude=${reg.lon}&start=${START_YEAR}0101&end=${END_YEAR}1231&format=JSON`;
  for (let i = 1; i <= 3; i++) {
    try {
      console.log(`Descargando NASA POWER (${key}), intento ${i}...`);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
      const json = await res.json();
      fs.writeFileSync(cacheFile, JSON.stringify(json));
      return json;
    } catch (e) {
      console.warn(`  Falló: ${e.message}`);
      await new Promise((r) => setTimeout(r, 3000 * i));
    }
  }
  throw new Error("No se pudo descargar NASA POWER");
}

export function toDaily(json) {
  const p = json.properties.parameter;
  const ok = (x) => x != null && x > -998;
  return Object.keys(p.T2M).map((k) => ({
    y: +k.slice(0, 4), m: +k.slice(4, 6),
    t: p.T2M[k], tmax: p.T2M_MAX[k], tmin: p.T2M_MIN[k], p: p.PRECTOTCORR[k],
    gwr: p.GWETROOT?.[k], gwt: p.GWETTOP?.[k],
  })).filter((d) => ok(d.t) && ok(d.tmax) && ok(d.tmin) && ok(d.p))
    .map((d) => ({ ...d, gwr: ok(d.gwr) ? d.gwr : null, gwt: ok(d.gwt) ? d.gwt : null }));
}

// ---------------------------------------------------------------------------
// 4. UTILIDADES
// ---------------------------------------------------------------------------
const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null);
const round = (x, d = 1) => (x == null || !Number.isFinite(x) ? null : +x.toFixed(d));
function percentile(arr, q) {
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(q * s.length))];
}

// Radiación extraterrestre FAO-56 (MJ/m2/día), día medio del mes
function ra(latDeg, month) {
  const J = [15, 46, 74, 105, 135, 166, 196, 227, 258, 288, 319, 349][month - 1];
  const phi = (latDeg * Math.PI) / 180;
  const dr = 1 + 0.033 * Math.cos((2 * Math.PI * J) / 365);
  const delta = 0.409 * Math.sin((2 * Math.PI * J) / 365 - 1.39);
  const ws = Math.acos(Math.max(-1, Math.min(1, -Math.tan(phi) * Math.tan(delta))));
  return ((24 * 60) / Math.PI) * 0.082 * dr * (ws * Math.sin(phi) * Math.sin(delta) + Math.cos(phi) * Math.cos(delta) * Math.sin(ws));
}
// Evapotranspiración de referencia Hargreaves-Samani (mm/día)
const et0Day = (m, t, tmax, tmin) => Math.max(0, 0.0023 * 0.408 * ra(REGION.lat, m) * (t + 17.8) * Math.sqrt(Math.max(0, tmax - tmin)));
// Lluvia efectiva mensual (USDA SCS, FAO CROPWAT)
const effRain = (p) => (p <= 250 ? (p * (125 - 0.2 * p)) / 125 : 125 + 0.1 * p);

// Pendiente de Sen + prueba de Mann-Kendall (tendencia y si es estadísticamente sólida)
function trend(years, values) {
  const pts = years.map((y, i) => [y, values[i]]).filter(([, v]) => v != null && Number.isFinite(v));
  const n = pts.length;
  if (n < 6) return { perDecade: null, pValue: null, significant: false, n };
  const slopes = [];
  let S = 0;
  for (let i = 0; i < n - 1; i++)
    for (let j = i + 1; j < n; j++) {
      slopes.push((pts[j][1] - pts[i][1]) / (pts[j][0] - pts[i][0]));
      S += Math.sign(pts[j][1] - pts[i][1]);
    }
  const sen = percentile(slopes, 0.5);
  const varS = (n * (n - 1) * (2 * n + 5)) / 18;
  const Z = S > 0 ? (S - 1) / Math.sqrt(varS) : S < 0 ? (S + 1) / Math.sqrt(varS) : 0;
  const pValue = 2 * (1 - normCdf(Math.abs(Z)));
  return { perDecade: sen * 10, sign: Math.sign(S), pValue: round(pValue, 3), significant: pValue < 0.05, n };
}
function normCdf(z) {
  const t = 1 / (1 + 0.2316419 * z);
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  return 1 - d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
}

export function readCsv(file) {
  if (!fs.existsSync(file)) return null;
  const [header, ...lines] = fs.readFileSync(file, "utf8").trim().split(/\r?\n/);
  const cols = header.split(",").map((c) => c.trim());
  return lines.map((l) => {
    const v = l.split(","), o = {};
    cols.forEach((c, i) => (o[c] = v[i] === "" || v[i] == null ? null : isNaN(+v[i]) ? v[i] : +v[i]));
    return o;
  });
}

// ---------------------------------------------------------------------------
// 5. SUELO
// ---------------------------------------------------------------------------
function usdaTexture(sand, silt, clay) {
  if (silt + 1.5 * clay < 15) return "Arena";
  if (silt + 2 * clay < 30) return "Arena franca";
  if ((clay >= 7 && clay < 20 && sand > 52) || (clay < 7 && silt < 50)) return "Franco arenoso";
  if (clay >= 7 && clay < 27 && silt >= 28 && silt < 50 && sand <= 52) return "Franco";
  if ((silt >= 50 && clay >= 12 && clay < 27) || (silt >= 50 && silt < 80 && clay < 12)) return "Franco limoso";
  if (silt >= 80 && clay < 12) return "Limo";
  if (clay >= 20 && clay < 35 && silt < 28 && sand > 45) return "Franco arcillo arenoso";
  if (clay >= 27 && clay < 40 && sand > 20 && sand <= 45) return "Franco arcilloso";
  if (clay >= 27 && clay < 40 && sand <= 20) return "Franco arcillo limoso";
  if (clay >= 35 && sand > 45) return "Arcillo arenoso";
  if (clay >= 40 && silt >= 40) return "Arcillo limoso";
  return "Arcilla";
}
const TEXTURE_GROUP = {
  "Arena": "arenoso", "Arena franca": "arenoso", "Franco arenoso": "franco-arenoso",
  "Franco": "franco", "Franco limoso": "franco", "Limo": "franco",
  "Franco arcillo arenoso": "franco-arcilloso", "Franco arcilloso": "franco-arcilloso", "Franco arcillo limoso": "franco-arcilloso",
  "Arcillo arenoso": "arcilloso", "Arcillo limoso": "arcilloso", "Arcilla": "arcilloso",
};
const TEXTURE_NOTE = {
  arenoso: "Drena rápido y retiene poca agua: riego frecuente y en poca cantidad.",
  "franco-arenoso": "Buen drenaje, retención moderada: apto para la mayoría de cultivos.",
  franco: "Equilibrado: buena retención y buen drenaje.",
  "franco-arcilloso": "Retiene bastante agua: cuidado con encharcamientos en lluvias fuertes.",
  arcilloso: "Retiene mucha agua y drena lento: riesgo de encharcamiento y compactación.",
};

// ---------------------------------------------------------------------------
// 6. CULTIVOS: aptitud por mes de siembra
// ---------------------------------------------------------------------------
function trap(x, opt, abs) {
  if (x >= opt[0] && x <= opt[1]) return 1;
  if (x <= abs[0] || x >= abs[1]) return 0;
  return x < opt[0] ? (x - abs[0]) / (opt[0] - abs[0]) : (abs[1] - x) / (abs[1] - opt[1]);
}
function evaluate(crop, clim, start, group) {
  let tScore = 1, rain = 0, irr = 0, need = 0, heat = 0, heat35 = 0, frost = 0, extreme = 0;
  for (let k = 0; k < crop.cycle; k++) {
    const c = clim[(start - 1 + k) % 12];
    tScore = Math.min(tScore, trap(c.t, crop.tOpt, crop.tAbs));
    const etc = crop.kc * c.et0;
    need += etc; rain += c.p; irr += Math.max(0, etc - effRain(c.p));
    heat += c.heatDays; heat35 += c.heatDays35; frost += c.frostDays; extreme += c.extremeRainDays;
  }
  // penalización por calor severo (Tmax >= 35 °C) según la fracción del ciclo y la tolerancia del cultivo
  const heatPenalty = Math.min(0.5, (heat35 / (crop.cycle * 30.4)) * { baja: 3, media: 2, alta: 1 }[crop.heatTol]);
  const frostPenalty = frost > 0.5 ? 0.5 : 0;
  const tex = group ? crop.texture[group] : 1;
  const climate = Math.max(0, tScore - heatPenalty - frostPenalty);
  return {
    sowMonth: start, harvestMonth: ((start - 1 + crop.cycle) % 12) + 1,
    rainfed: round(Math.min(climate, trap(rain, crop.rainOpt, crop.rainAbs)) * tex, 2),
    irrigated: round(climate * tex, 2),
    cycleRainMm: Math.round(rain), cropWaterNeedMm: Math.round(need), irrigationMm: Math.round(irr),
    heatDays: round(heat, 1), extremeRainDays: round(extreme, 1),
  };
}
// Mes de clima tal como lo usa evaluate(), para exportarlo a la web
const modelMonth = (c) => ({ t: round(c.t, 2), p: round(c.p, 1), et0: round(c.et0, 1), heatDays: round(c.heatDays, 2),
  heatDays35: round(c.heatDays35, 2), frostDays: round(c.frostDays, 2), extremeRainDays: round(c.extremeRainDays, 2) });
function analyzeCrop(crop, clim, group) {
  const all = Array.from({ length: 12 }, (_, i) => evaluate(crop, clim, i + 1, group));
  const best = all.reduce((a, b) => (b.rainfed > a.rainfed || (b.rainfed === a.rainfed && b.irrigationMm < a.irrigationMm) ? b : a));
  const bestIrr = all.reduce((a, b) => (b.irrigated > a.irrigated || (b.irrigated === a.irrigated && b.irrigationMm < a.irrigationMm) ? b : a));
  return { best, bestIrrigated: bestIrr, sowingWindow: all.filter((e) => e.rainfed >= 0.7).map((e) => e.sowMonth), byMonth: all };
}

// ---------------------------------------------------------------------------
// 7. PRINCIPAL
// ---------------------------------------------------------------------------
export function analyze({ region, daily, gee, soilRow, cmip6, soilsRaw = null, verbose = false }) {
  REGION = region;
  const years = [];
  for (let y = START_YEAR; y <= END_YEAR; y++) if (daily.filter((d) => d.y === y).length > 330) years.push(y);
  const half = Math.floor(years.length / 2);
  const early = years.slice(0, half), recent = years.slice(half);
  const label = (ys) => `${ys[0]}-${ys[ys.length - 1]}`;


  // Lluvia mensual del satélite GPM IMERG (más confiable que MERRA-2 en el Caribe)
  const imerg = new Map((gee ?? []).filter((r) => r.imerg_mm != null).map((r) => [`${r.year}-${r.month}`, r.imerg_mm]));
  const useImerg = imerg.size > 0;
  const imergP90 = useImerg ? percentile([...imerg.values()], 0.9) : null;
  if (useImerg && verbose) console.log("Lluvia: usando NASA GPM IMERG (satélite) en lugar de POWER.");

  // Umbral relativo de suelo seco: percentil 20 de toda la serie
  const gwrAll = daily.map((d) => d.gwr).filter((x) => x != null);
  const dryThreshold = gwrAll.length ? percentile(gwrAll, 0.2) : null;
  // Umbral relativo de lluvia muy intensa: percentil 95 de días con lluvia
  const wet = daily.filter((d) => d.p >= DRY_DAY).map((d) => d.p);
  const p95 = percentile(wet, 0.95);

  // ---- Serie anual de cada indicador ----
  const annual = years.map((y) => {
    const ds = daily.filter((d) => d.y === y);
    let spell = 0, maxSpell = 0;
    for (const d of ds) { spell = d.p < DRY_DAY ? spell + 1 : 0; maxSpell = Math.max(maxSpell, spell); }
    const rainPower = ds.reduce((s, d) => s + d.p, 0);
    const im = Array.from({ length: 12 }, (_, i) => imerg.get(`${y}-${i + 1}`)).filter((x) => x != null);
    const rain = useImerg ? (im.length === 12 ? im.reduce((a, b) => a + b, 0) : null) : rainPower;
    const et0 = ds.reduce((s, d) => s + et0Day(d.m, d.t, d.tmax, d.tmin), 0);
    const g = gee?.filter((r) => r.year === y) ?? [];
    const gv = (k) => g.map((r) => r[k]).filter((x) => x != null);
    return {
      year: y,
      tmean: round(mean(ds.map((d) => d.t)), 2),
      tmaxMean: round(mean(ds.map((d) => d.tmax)), 2),
      heatDays32: ds.filter((d) => d.tmax >= HEAT_MODERATE).length,
      heatDays35: ds.filter((d) => d.tmax >= HEAT_SEVERE).length,
      frostDays: ds.filter((d) => d.tmin <= FROST).length,
      nearFrostDays: ds.filter((d) => d.tmin <= NEAR_FROST).length,
      tminAbs: round(Math.min(...ds.map((d) => d.tmin)), 1),
      rainMm: rain == null ? null : Math.round(rain),
      rainPowerMm: Math.round(rainPower),
      extremeRainMonths: useImerg ? im.filter((x) => x >= imergP90).length : null,
      extremeRainDays: ds.filter((d) => d.p >= EXTREME_RAIN).length,
      veryWetDaysP95: ds.filter((d) => d.p >= p95).length,
      maxDailyRainMm: round(Math.max(...ds.map((d) => d.p)), 1),
      longestDrySpell: maxSpell,
      soilMoistureRoot: round(mean(ds.map((d) => d.gwr).filter((x) => x != null)), 3),
      soilMoistureTop: round(mean(ds.map((d) => d.gwt).filter((x) => x != null)), 3),
      drySoilDays: dryThreshold == null ? null : ds.filter((d) => d.gwr != null && d.gwr <= dryThreshold).length,
      et0Mm: Math.round(et0),
      waterBalanceMm: rain == null ? null : Math.round(rain - et0),
      etModisMm: gv("et_modis").length ? Math.round(gv("et_modis").reduce((a, b) => a + b, 0)) : null,
      ndvi: round(mean(gv("ndvi")), 3),
      smapRootZone: round(mean(gv("smap_rz")), 3),
      graceCm: round(mean(gv("grace")), 2),
    };
  });

  // ---- Estrés de vegetación: meses con NDVI muy por debajo de lo normal (z < -1) ----
  let vegStress = null;
  if (gee?.some((r) => r.ndvi != null)) {
    const byMonth = Array.from({ length: 12 }, (_, i) => gee.filter((r) => r.month === i + 1 && r.ndvi != null).map((r) => r.ndvi));
    const stats = byMonth.map((v) => { const m = mean(v); return { m, sd: Math.sqrt(mean(v.map((x) => (x - m) ** 2))) }; });
    const anomalies = gee.filter((r) => r.ndvi != null).map((r) => ({
      year: r.year, month: r.month, z: round((r.ndvi - stats[r.month - 1].m) / (stats[r.month - 1].sd || 1), 2) }));
    annual.forEach((a) => (a.vegStressMonths = anomalies.filter((x) => x.year === a.year && x.z < -1).length));
    vegStress = { worstMonths: [...anomalies].sort((a, b) => a.z - b.z).slice(0, 5).map((x) => ({ ...x, label: `${MONTHS[x.month - 1]} ${x.year}` })) };
  }

  // ---- Climatología mensual (calendario de riesgos) ----
  const nYears = years.length;
  const climFor = (ys) => Array.from({ length: 12 }, (_, i) => {
    const ds = daily.filter((d) => d.m === i + 1 && ys.includes(d.y));
    const n = ys.length;
    const t = mean(ds.map((d) => d.t)), tmax = mean(ds.map((d) => d.tmax)), tmin = mean(ds.map((d) => d.tmin));
    return {
      month: i + 1, t, tmax, tmin,
      p: useImerg
        ? mean(ys.map((y) => imerg.get(`${y}-${i + 1}`)).filter((x) => x != null))
        : ds.reduce((s, d) => s + d.p, 0) / n,
      et0: ds.reduce((s, d) => s + et0Day(d.m, d.t, d.tmax, d.tmin), 0) / n,
      heatDays: ds.filter((d) => d.tmax >= HEAT_MODERATE).length / n,
      heatDays35: ds.filter((d) => d.tmax >= HEAT_SEVERE).length / n,
      frostDays: ds.filter((d) => d.tmin <= NEAR_FROST).length / n,
      extremeRainDays: ds.filter((d) => d.p >= EXTREME_RAIN).length / n,
      soil: mean(ds.map((d) => d.gwr).filter((x) => x != null)),
      ndvi: gee ? mean(gee.filter((r) => r.month === i + 1 && ys.includes(r.year) && r.ndvi != null).map((r) => r.ndvi)) : null,
    };
  });
  const clim = climFor(years), climEarly = climFor(early), climRecent = climFor(recent);
  const SCEN_LABEL = { ssp245: "emisiones intermedias (SSP2-4.5)", ssp585: "emisiones altas (SSP5-8.5)" };
  const futureClim = (rows) => climRecent.map((c) => {
        const d = rows.find((x) => x.month === c.month);
        if (!d) return c;
        const r = Math.min(2, Math.max(0.3, d.pRatio));
        const t = c.t + d.dT, tmax = c.tmax + d.dT, tmin = c.tmin + d.dT;
        // los días de calor futuros se estiman desplazando la serie diaria reciente
        const ds = daily.filter((x) => x.m === c.month && recent.includes(x.y));
        return { ...c, t, tmax, tmin, p: c.p * r, et0: et0Day(c.month, t, tmax, tmin) * DAYS[c.month - 1],
          heatDays: ds.filter((x) => x.tmax + d.dT >= HEAT_MODERATE).length / recent.length,
          heatDays35: ds.filter((x) => x.tmax + d.dT >= HEAT_SEVERE).length / recent.length,
          frostDays: ds.filter((x) => x.tmin + d.dT <= NEAR_FROST).length / recent.length };
      });
  const futures = [];
  for (const key of [...new Set((cmip6 ?? []).map((r) => `${r.scenario}|${r.horizon}`))].sort()) {
    const [scenario, horizon] = key.split("|");
    const rows = cmip6.filter((r) => r.scenario === scenario && r.horizon === horizon);
    if (rows.length < 12) continue;
    futures.push({ key: `${scenario}_${horizon}`, scenario, horizon, label: `${horizon}, ${SCEN_LABEL[scenario] ?? scenario}`, clim: futureClim(rows) });
  }
  const mainFuture = futures.find((x) => x.key === "ssp245_2041-2060") ?? futures[0] ?? null;
  const climFuture = mainFuture?.clim ?? null;
  const sumK = (cl, k) => cl.reduce((a, c) => a + c[k], 0);
  const projections = futures.map((fu) => {
    const rain0 = sumK(climRecent, "p"), rain1 = sumK(fu.clim, "p");
    const et00 = sumK(climRecent, "et0"), et01 = sumK(fu.clim, "et0");
    return {
      key: fu.key, scenario: fu.scenario, horizon: fu.horizon, label: fu.label,
      tempChangeC: round(mean(fu.clim.map((c, i) => c.t - climRecent[i].t)), 1),
      rainNowMm: Math.round(rain0), rainFutureMm: Math.round(rain1), rainChangePct: round((100 * (rain1 - rain0)) / rain0, 0),
      heatDaysNow: Math.round(sumK(climRecent, "heatDays")), heatDaysFuture: Math.round(sumK(fu.clim, "heatDays")),
      heatDays35Now: Math.round(sumK(climRecent, "heatDays35")), heatDays35Future: Math.round(sumK(fu.clim, "heatDays35")),
      et0NowMm: Math.round(et00), et0FutureMm: Math.round(et01),
      waterBalanceNowMm: Math.round(rain0 - et00), waterBalanceFutureMm: Math.round(rain1 - et01),
      monthly: fu.clim.map((c, i) => ({ month: MONTHS[c.month - 1], t: round(c.t), rainMm: Math.round(c.p), rainNowMm: Math.round(climRecent[i].p), heatDays: round(c.heatDays) })),
    };
  });

  // ---- Los 8 indicadores del reto ----
  const col = (k) => annual.map((a) => a[k]);
  const cmp = (k) => ({ early: round(mean(annual.filter((a) => early.includes(a.year)).map((a) => a[k]).filter((x) => x != null)), 2),
    recent: round(mean(annual.filter((a) => recent.includes(a.year)).map((a) => a[k]).filter((x) => x != null)), 2) });
  const ind = (key, title, unit, source, k, explain) => {
    const tr = trend(years, col(k));
    const c = cmp(k);
    const dir = tr.perDecade == null ? "sin datos" : !tr.significant ? "sin tendencia clara" : tr.sign > 0 ? "en aumento" : "en descenso";
    return { key, title, unit, source, metric: k, ...c, trendPerDecade: round(tr.perDecade, 2), pValue: tr.pValue, significant: tr.significant, direction: dir,
      message: explain(c, tr, dir) };
  };
  const f = (x, d = 1) => (x == null ? "s/d" : round(x, d));

  const indicators = [
    ind("heat", "Estrés térmico", `días/año con Tmax ≥ ${HEAT_MODERATE} °C`, "NASA POWER (MERRA-2)", "heatDays32",
      (c, tr, dir) => `De ${f(c.early, 0)} a ${f(c.recent, 0)} días calurosos por año (${label(early)} vs ${label(recent)}); ${dir}.`),
    ind("rain", "Precipitaciones", "mm/año", useImerg ? "NASA GPM IMERG V07 (satélite)" : "NASA POWER (MERRA-2)", "rainMm",
      (c, tr, dir) => `Lluvia anual de ${f(c.early, 0)} a ${f(c.recent, 0)} mm; ${dir}.`),
    ind("soil", "Humedad del suelo", "índice 0-1, zona radicular", "NASA POWER GWETROOT (MERRA-2)" + (gee ? " + SMAP L4" : ""), "soilMoistureRoot",
      (c, tr, dir) => `Humedad radicular media de ${f(c.early, 2)} a ${f(c.recent, 2)}; ${dir}.`),
    ind("evap", "Evaporación", "mm/año (ET0 Hargreaves)", "NASA POWER" + (gee ? " + MODIS MOD16" : ""), "et0Mm",
      (c, tr, dir) => `La demanda de agua de la atmósfera pasó de ${f(c.early, 0)} a ${f(c.recent, 0)} mm/año; ${dir}.`),
    ind("frost", "Riesgo de heladas", `días/año con Tmin ≤ ${NEAR_FROST} °C`, "NASA POWER (MERRA-2)", "nearFrostDays",
      (c) => (c.early === 0 && c.recent === 0 ? "Sin riesgo de heladas en el periodo analizado." : `De ${f(c.early)} a ${f(c.recent)} días con riesgo de helada por año.`)),
    useImerg
      ? ind("extreme", "Precipitaciones extremas", `meses/año con lluvia ≥ ${Math.round(imergP90)} mm (percentil 90)`, "NASA GPM IMERG V07 (satélite)", "extremeRainMonths",
          (c, tr, dir) => `De ${f(c.early)} a ${f(c.recent)} meses de lluvia extrema por año; ${dir}.`)
      : ind("extreme", "Precipitaciones extremas", `días/año con ≥ ${EXTREME_RAIN} mm`, "NASA POWER (MERRA-2)", "extremeRainDays",
          (c, tr, dir) => `De ${f(c.early)} a ${f(c.recent)} días de lluvia extrema por año; ${dir}.`),
    gee?.some((r) => r.ndvi != null)
      ? ind("veg", "Estrés de la vegetación", "meses/año con NDVI anómalo bajo (z < -1)", "MODIS MOD13Q1 NDVI", "vegStressMonths",
          (c, tr, dir) => `De ${f(c.early)} a ${f(c.recent)} meses con vegetación estresada por año; ${dir}.`)
      : { key: "veg", title: "Estrés de la vegetación", message: "Falta fieldshift_gee.csv (MODIS NDVI)." },
    ind("water", "Tendencia hídrica a largo plazo", "mm/año (lluvia menos evaporación)", "NASA POWER" + (gee ? " + GRACE/GRACE-FO" : ""), "waterBalanceMm",
      (c, tr, dir) => `Balance hídrico de ${f(c.early, 0)} a ${f(c.recent, 0)} mm/año (${c.recent < 0 ? "déficit" : "superávit"}); ${dir}.`),
  ];
  // extras útiles para el mensaje hídrico
  const drySpell = { ...cmp("longestDrySpell"), ...(({ perDecade, significant }) => ({ trendPerDecade: round(perDecade, 1), significant }))(trend(years, col("longestDrySpell"))) };
  const grace = gee?.some((r) => r.grace != null) ? { ...cmp("graceCm"), ...(({ perDecade, significant }) => ({ trendPerDecade: round(perDecade, 2), significant }))(trend(years, col("graceCm"))) } : null;

  // ---- Suelo ----
  let soil = null, group = null;
  if (soilRow && [soilRow.sand, soilRow.clay, soilRow.silt].some((x) => x == null))
    verbose && console.warn("AVISO: soil.json tiene valores vacíos (null). Se ignora el suelo.");
  if (soilRow && [soilRow.sand, soilRow.clay, soilRow.silt].every((x) => x != null)) {
    const cls = usdaTexture(soilRow.sand, soilRow.silt, soilRow.clay);
    group = TEXTURE_GROUP[cls];
    soil = { sand: round(soilRow.sand), clay: round(soilRow.clay), silt: round(soilRow.silt), ph: round(soilRow.ph), soc: round(soilRow.soc),
      textureClass: cls, group, note: TEXTURE_NOTE[group], source: "ISRIC SoilGrids 2.0 (0-30 cm)" };
  }

  // ---- Cultivos ----
  const crops = CROPS.map((crop) => {
    const now = analyzeCrop(crop, climRecent, group);
    const before = analyzeCrop(crop, climEarly, group).best;
    const fut = climFuture ? analyzeCrop(crop, climFuture, group).best : null;
    const futureByScenario = Object.fromEntries(futures.map((fu) => [fu.key, analyzeCrop(crop, fu.clim, group).best.rainfed]));
    return {
      id: crop.id, name: crop.name, family: crop.family, cycle: crop.cycle,
      best: { ...now.best, sowMonth: MONTHS[now.best.sowMonth - 1], harvestMonth: MONTHS[now.best.harvestMonth - 1] },
      bestIrrigated: { ...now.bestIrrigated, sowMonth: MONTHS[now.bestIrrigated.sowMonth - 1], harvestMonth: MONTHS[now.bestIrrigated.harvestMonth - 1] },
      sowingWindow: now.sowingWindow.map((m) => MONTHS[m - 1]),
      byMonth: now.byMonth.map((e) => ({ m: MONTHS[e.sowMonth - 1], rainfed: e.rainfed, irrigated: e.irrigated, irrigationMm: e.irrigationMm })),
      aptitude: { early: before.rainfed, recent: now.best.rainfed, future: fut?.rainfed ?? null, futureByScenario },
      futureBest: fut ? { sowMonth: MONTHS[fut.sowMonth - 1], irrigationMm: fut.irrigationMm } : null,
    };
  }).sort((a, b) => b.best.rainfed - a.best.rainfed || b.bestIrrigated.irrigated - a.bestIrrigated.irrigated);

  // ---- Mensajes para el agricultor ----
  const insights = [];
  for (const c of crops) {
    if (c.best.rainfed >= 0.7)
      insights.push({ type: "oportunidad", text: `${c.name}: buena ventana de siembra en ${c.best.sowMonth} (cosecha ~${c.best.harvestMonth}). Riego de apoyo estimado: ${c.best.irrigationMm} mm por ciclo.` });
    else if (c.bestIrrigated.irrigated >= 0.7)
      insights.push({ type: "riego", text: `${c.name}: viable con riego. Sembrando en ${c.bestIrrigated.sowMonth} necesitaría ~${c.bestIrrigated.irrigationMm} mm de riego por ciclo.` });
    const d = c.aptitude.recent - c.aptitude.early;
    if (d >= 0.1) insights.push({ type: "tendencia+", text: `${c.name}: mejoró su aptitud entre ${label(early)} y ${label(recent)} (${c.aptitude.early} → ${c.aptitude.recent}).` });
    if (d <= -0.1) insights.push({ type: "alerta", text: `${c.name}: perdió aptitud entre ${label(early)} y ${label(recent)} (${c.aptitude.early} → ${c.aptitude.recent}).` });
    if (c.aptitude.future != null && c.aptitude.future - c.aptitude.recent <= -0.15)
      insights.push({ type: "alerta-futuro", text: `${c.name}: según NASA NEX-GDDP-CMIP6 (${mainFuture.label}) bajaría de ${c.aptitude.recent} a ${c.aptitude.future}.` });
    if (c.aptitude.future != null && c.aptitude.future - c.aptitude.recent >= 0.15)
      insights.push({ type: "oportunidad-futuro", text: `${c.name}: según NASA NEX-GDDP-CMIP6 (${mainFuture.label}) subiría de ${c.aptitude.recent} a ${c.aptitude.future}.` });
  }
  for (const pr of projections.filter((x) => x.key === mainFuture?.key)) {
    insights.push({ type: "futuro", text: `Hacia ${pr.horizon} (${SCEN_LABEL[pr.scenario] ?? pr.scenario}): ${pr.tempChangeC >= 0 ? "+" : ""}${pr.tempChangeC} °C, lluvia ${pr.rainChangePct >= 0 ? "+" : ""}${pr.rainChangePct}% y ${pr.heatDaysFuture} días/año sobre ${HEAT_MODERATE} °C (hoy ${pr.heatDaysNow}).` });
  }

  // ---- Ranking de cultivos para cada tipo de suelo ----
  const GROUPS = ["arenoso", "franco-arenoso", "franco", "franco-arcilloso", "arcilloso"];
  const soilTypes = GROUPS.map((g) => {
    const info = soilsRaw?.groups?.find((x) => x.group === g) ?? null;
    const ranking = CROPS.map((crop) => {
      const a = analyzeCrop(crop, climRecent, g);
      const fu = climFuture ? analyzeCrop(crop, climFuture, g).best : null;
      return { name: crop.name, rainfed: a.best.rainfed, irrigated: a.bestIrrigated.irrigated, sowMonth: MONTHS[a.best.sowMonth - 1],
        harvestMonth: MONTHS[a.best.harvestMonth - 1], irrigationMm: a.best.irrigationMm, future: fu?.rainfed ?? null };
    }).sort((a, b) => b.rainfed - a.rainfed || b.irrigated - a.irrigated);
    return { group: g, note: TEXTURE_NOTE[g], presentInRegion: info ? info.pct > 0 : null, pctOfValley: info?.pct ?? null, areaKm2: info?.areaKm2 ?? null,
      sample: info ? { sand: round(info.sand), clay: round(info.clay), silt: round(info.silt), lat: round(info.lat, 3), lon: round(info.lon, 3) } : null, ranking };
  });

  const riskyMonths = (k, thr) => clim.filter((c) => c[k] >= thr).map((c) => MONTHS[c.month - 1]);
  const heatM = riskyMonths("heatDays", 10), wetM = riskyMonths("extremeRainDays", 0.5);
  if (heatM.length) insights.push({ type: "riesgo", text: `Meses con más estrés térmico: ${heatM.join(", ")}. Evita que la floración caiga en esos meses.` });
  if (wetM.length && !useImerg) insights.push({ type: "riesgo", text: `Meses con más lluvias extremas: ${wetM.join(", ")}. Prioriza drenaje y evita cosechar en esas fechas.` });
  if (!useImerg && drySpell.significant && drySpell.trendPerDecade > 0)
    insights.push({ type: "alerta", text: `Las rachas secas se están alargando (+${drySpell.trendPerDecade} días por década).` });

  const out = {
    region: REGION, period: `${years[0]}-${years[years.length - 1]}`, compare: { early: label(early), recent: label(recent) },
    sources: ["NASA POWER (MERRA-2)", useImerg && "NASA GPM IMERG V07", gee && "MODIS NDVI / MOD16 ET, SMAP L4, GRACE/GRACE-FO (Google Earth Engine)", soil && "ISRIC SoilGrids 2.0",
      futures.length && "NASA NEX-GDDP-CMIP6 (5 modelos: ACCESS-CM2, MIROC6, MPI-ESM1-2-LR, NorESM2-LM, GFDL-ESM4)", "FAO ECOCROP / FAO-56 (valores aproximados)"].filter(Boolean),
    thresholds: { heatModerate: HEAT_MODERATE, heatSevere: HEAT_SEVERE, nearFrost: NEAR_FROST, extremeRain: EXTREME_RAIN, drySoilGwetroot: round(dryThreshold, 3), veryWetP95: round(p95, 1) },
    indicators, extras: { longestDrySpell: drySpell, grace },
    vegetationStress: vegStress,
    soil,
    annual,
    monthly: clim.map((c) => ({ month: MONTHS[c.month - 1], t: round(c.t), tmax: round(c.tmax), tmin: round(c.tmin), rainMm: Math.round(c.p), et0Mm: Math.round(c.et0),
      heatDays: round(c.heatDays), frostDays: round(c.frostDays), extremeRainDays: round(c.extremeRainDays, 2), soilMoisture: round(c.soil, 3), ndvi: round(c.ndvi, 3) })),
    projections, soilTypes,
    crops, insights,
    // Datos para que la web recalcule la aptitud con el mismo método que evaluate()
    // (rotaciones por zona y simulador «¿y si llueve menos?»). Solo se agrega: no cambia nada de lo anterior.
    model: {
      group,
      clim: climRecent.map(modelMonth),
      futures: Object.fromEntries(futures.map((fu) => [fu.key, fu.clim.map(modelMonth)])),
      crops: CROPS.map(({ id, name, family, cycle, kc, tOpt, tAbs, rainOpt, rainAbs, heatTol, texture }) =>
        ({ id, name, family, cycle, kc, tOpt, tAbs, rainOpt, rainAbs, heatTol, texture })),
    },
  };

  return { out, indicators, annual, drySpell, useImerg, projections, soilTypes, soil, crops, early, recent };
}

async function main() {
  const daily = toDaily(await fetchPower());
  const gee = readCsv("fieldshift_gee.csv");
  let soilRaw = fs.existsSync("soil.json") ? JSON.parse(fs.readFileSync("soil.json", "utf8").trim()) : null;
  if (typeof soilRaw === "string") soilRaw = JSON.parse(soilRaw); // acepta la línea copiada con comillas de la consola de GEE
  const soilRow = Array.isArray(soilRaw) ? soilRaw.find((s) => s.id === REGION.id) ?? soilRaw[0] : soilRaw;
  const cmip6 = readCsv("fieldshift_cmip6.csv")?.filter((r) => r.id === REGION.id)
    .map((r) => ({ ...r, scenario: r.scenario ?? "ssp245", horizon: r.horizon ?? "2041-2060" }))
    .filter((r) => Number.isFinite(r.dT) && Number.isFinite(r.pRatio));
  // tipos de suelo del valle (gee-cibao-soils.js)
  let soilsRaw = fs.existsSync("soils.json") ? JSON.parse(fs.readFileSync("soils.json", "utf8").trim()) : null;
  if (typeof soilsRaw === "string") soilsRaw = JSON.parse(soilsRaw);
  if (!gee) console.warn("AVISO: falta fieldshift_gee.csv (NDVI, ET satelital, SMAP, GRACE).");
  if (!soilRow) console.warn("AVISO: falta soil.json (textura del suelo).");
  if (!cmip6?.length) console.warn("AVISO: falta fieldshift_cmip6.csv (proyección futura).");
  const r = analyze({ region: REGION, daily, gee, soilRow, cmip6, soilsRaw, verbose: true });
  const { out, indicators, annual, drySpell, useImerg, projections, soilTypes, soil, crops, early, recent } = r;
  fs.mkdirSync("data", { recursive: true });
  fs.writeFileSync(path.join("data", "region.json"), JSON.stringify(out, null, 2));

  console.log(`\n${REGION.name} (${out.period})  ${early.length}+${recent.length} años\n`);
  for (const i of indicators) console.log(`- ${i.title}: ${i.message}${i.pValue != null ? `  [p${i.pValue < 0.001 ? "<0.001" : "=" + i.pValue}]` : ""}`);
  if (useImerg) {
    console.log("\nLluvia anual POWER vs GPM IMERG (mm):");
    for (const a of annual) console.log(`  ${a.year}: POWER ${a.rainPowerMm} | IMERG ${a.rainMm ?? "año incompleto"}`);
  }
  if (!useImerg) console.log(`\nRachas secas máximas: ${drySpell.early} → ${drySpell.recent} días`);
  if (projections.length) {
    console.log("\nPROYECCIÓN (NASA NEX-GDDP-CMIP6, vs 2016-2025):");
    for (const pr of projections)
      console.log(`  ${pr.label}: ${pr.tempChangeC >= 0 ? "+" : ""}${pr.tempChangeC} °C | lluvia ${pr.rainChangePct >= 0 ? "+" : ""}${pr.rainChangePct}% | días ≥${HEAT_MODERATE} °C: ${pr.heatDaysNow} → ${pr.heatDaysFuture} | balance hídrico: ${pr.waterBalanceNowMm} → ${pr.waterBalanceFutureMm} mm`);
  }
  if (soilsRaw?.groups) {
    console.log("\nTIPOS DE SUELO EN EL VALLE (SoilGrids):");
    for (const g of soilsRaw.groups) console.log(`  ${g.group}: ${g.pct}% (${g.areaKm2} km2)`);
  }
  console.log("\nMEJOR CULTIVO POR TIPO DE SUELO (hoy → futuro):");
  for (const st of soilTypes) console.log(`  ${st.group}${st.pctOfValley != null ? ` (${st.pctOfValley}%)` : ""}: ${st.ranking.slice(0, 3).map((r) => `${r.name} ${r.rainfed}${r.future != null ? "→" + r.future : ""}`).join(", ")}`);
  if (soil) console.log(`Suelo: ${soil.textureClass} (arena ${soil.sand}%, arcilla ${soil.clay}%, limo ${soil.silt}%)`);
  console.log(`\nTop cultivos: ${crops.slice(0, 4).map((c) => `${c.name} ${c.best.rainfed}`).join(", ")}`);
  console.log(`\nListo: data/region.json`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main().catch((e) => { console.error(e); process.exit(1); });
