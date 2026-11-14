// FIELD SHIFT - Análisis de TODOS los puntos del Valle del Cibao
// Uso:  node build-grid.mjs     (necesita build-data.mjs en la misma carpeta)
//
// Entradas (misma carpeta):
//   fieldshift_grid.csv       -> export de gee-grid.js (NDVI, ET, SMAP, IMERG por punto y mes)
//   fieldshift_grid_soil.csv  -> export de gee-grid.js (suelo por punto)
//   fieldshift_cmip6.csv      -> opcional, export de gee-cmip6.js (proyección futura del Cibao)
//   fieldshift_grid_terrain.csv -> opcional, export de gee-terrain.js (pendiente SRTM por punto)
// Salida:
//   data/points.json          -> lista de puntos para pintar el mapa
//   data/points/<id>.json     -> análisis completo de cada punto (se carga al hacer clic)

import fs from "node:fs";
import path from "node:path";
import { analyze, fetchPower, toDaily, readCsv } from "./build-data.mjs";

// Pueblos de referencia para decir "cerca de ..."
const TOWNS = [
  ["Santiago", 19.45, -70.7], ["La Vega", 19.22, -70.53], ["Moca", 19.39, -70.52], ["San Francisco de Macorís", 19.3, -70.25],
  ["Salcedo", 19.38, -70.42], ["Tamboril", 19.48, -70.61], ["Licey al Medio", 19.43, -70.6], ["Navarrete", 19.56, -70.87],
  ["Esperanza", 19.59, -70.99], ["Mao", 19.55, -71.08], ["Sabaneta", 19.48, -71.35], ["Guayubín", 19.62, -71.33],
  ["Castañuelas", 19.71, -71.5], ["Montecristi", 19.85, -71.65], ["Dajabón", 19.55, -71.71], ["Cotuí", 19.05, -70.15],
  ["Pimentel", 19.18, -70.1], ["Villa Riva", 19.18, -69.91], ["Nagua", 19.38, -69.85], ["Jarabacoa", 19.12, -70.64],
  ["Villa Vásquez", 19.74, -71.45], ["Laguna Salada", 19.65, -71.08], ["Jánico", 19.32, -70.8],
];
const km = (a, b, c, d) => {
  const R = 6371, r = Math.PI / 180;
  const x = Math.sin(((c - a) * r) / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin(((d - b) * r) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
};
const nearest = (lat, lon) => {
  const [name, , , dist] = TOWNS.map((t) => [...t, km(lat, lon, t[1], t[2])]).sort((a, b) => a[3] - b[3])[0];
  return { name, km: Math.round(dist) };
};

const r0 = (x) => (x == null ? null : Math.round(x));
// Riesgo de erosión según la pendiente típica (clases FAO: 0–2 llano, 2–5 suave,
// 5–10 inclinado, >10 fuerte): <3 % baja, 3–8 % media, >8 % alta
const erosionRisk = (median) => (median == null ? null : median < 3 ? "baja" : median < 8 ? "media" : "alta");

async function main() {
  const grid = readCsv("fieldshift_grid.csv");
  // Se excluye la costa norte (al norte de la Cordillera Septentrional), que no es parte del valle
  const soils = readCsv("fieldshift_grid_soil.csv")?.filter((s) => !(s.lon > -70.95 && s.lat >= 19.65));
  if (!grid || !soils) throw new Error("Faltan fieldshift_grid.csv y/o fieldshift_grid_soil.csv (salen de gee-grid.js).");
  const cmip6 = readCsv("fieldshift_cmip6.csv")?.filter((r) => r.id === "cibao")
    .map((r) => ({ ...r, scenario: r.scenario ?? "ssp245", horizon: r.horizon ?? "2041-2060" }))
    .filter((r) => Number.isFinite(r.dT) && Number.isFinite(r.pRatio));
  if (!cmip6?.length) console.warn("AVISO: falta fieldshift_cmip6.csv. Se omite la proyección futura.");
  // Opcional: relieve (sale de gee-terrain.js). Si no existe, todo sigue igual que antes.
  const terrainRows = readCsv("fieldshift_grid_terrain.csv") ?? [];
  const terrainOk = terrainRows.length && "slope_median" in terrainRows[0];
  if (terrainRows.length && !terrainOk)
    console.warn("AVISO: fieldshift_grid_terrain.csv es de la versión vieja (sin slope_median). Vuelve a correr gee-terrain.js. Se omite el riesgo de erosión.");
  else if (!terrainRows.length) console.warn("AVISO: falta fieldshift_grid_terrain.csv. Se omite el riesgo de erosión.");
  const terrain = new Map(terrainOk ? terrainRows.map((t) => [t.id, t]) : []);

  // Agrupar datos mensuales por punto
  const byId = new Map();
  for (const r of grid) {
    if (!byId.has(r.id)) byId.set(r.id, []);
    byId.get(r.id).push(r);
  }

  // NASA POWER tiene celdas de 0.5° x 0.625°: se descarga una vez por celda, no por punto
  const cellKey = (lat, lon) => `cell_${Math.round(lat / 0.5)}_${Math.round(lon / 0.625)}`;
  const powerByCell = new Map();
  for (const s of soils) {
    const k = cellKey(s.lat, s.lon);
    if (!powerByCell.has(k)) powerByCell.set(k, s);
  }
  console.log(`${soils.length} puntos, ${powerByCell.size} celdas de NASA POWER.`);
  const noSoil = soils.filter((s) => s.sand == null || s.clay == null || s.silt == null).length;
  if (noSoil) console.warn(`AVISO: ${noSoil} puntos sin datos de suelo en fieldshift_grid_soil.csv.`);
  for (const [k, s] of powerByCell) {
    powerByCell.set(k, toDaily(await fetchPower({ lat: s.lat, lon: s.lon }, k)));
  }

  fs.mkdirSync(path.join("data", "points"), { recursive: true });
  const index = [];
  for (const s of soils.sort((a, b) => a.lon - b.lon || b.lat - a.lat)) {
    const near = nearest(s.lat, s.lon);
    const region = {
      id: s.id, name: near.km <= 3 ? near.name : `${near.km} km de ${near.name}`, country: "República Dominicana",
      lat: s.lat, lon: s.lon, elevationM: Math.round(s.elev),
    };
    const { out } = analyze({
      region, daily: powerByCell.get(cellKey(s.lat, s.lon)), gee: byId.get(s.id) ?? [],
      soilRow: { sand: s.sand, clay: s.clay, silt: s.silt, ph: s.ph, soc: s.soc }, cmip6,
    });
    delete out.soilTypes; // ya no hace falta: cada punto trae su propio suelo
    fs.writeFileSync(path.join("data", "points", `${s.id}.json`), JSON.stringify(out));

    const ind = Object.fromEntries(out.indicators.map((i) => [i.key, i]));
    const main = out.projections?.find((p) => p.key === "ssp245_2041-2060") ?? out.projections?.[0];
    index.push({
      id: s.id, lat: s.lat, lon: s.lon, name: region.name, elevationM: region.elevationM,
      soil: out.soil?.textureClass ?? null, soilGroup: out.soil?.group ?? null,
      rainMm: r0(ind.rain?.recent), heatDays: r0(ind.heat?.recent), waterBalanceMm: r0(ind.water?.recent),
      futureRainChangePct: main?.rainChangePct ?? null, futureTempChangeC: main?.tempChangeC ?? null,
      top: out.crops.slice(0, 3).map((c) => ({ name: c.name, score: c.best.rainfed, sow: c.best.sowMonth, future: c.aptitude.future })),
      topIrrigated: [...out.crops].sort((x, y) => y.bestIrrigated.irrigated - x.bestIrrigated.irrigated || x.bestIrrigated.irrigationMm - y.bestIrrigated.irrigationMm)
        .slice(0, 3).map((c) => ({ name: c.name, score: c.bestIrrigated.irrigated, sow: c.bestIrrigated.sowMonth, irrigationMm: c.bestIrrigated.irrigationMm })),
      ...(terrain.has(s.id) && {
        slopePct: Math.round(terrain.get(s.id).slope_median * 10) / 10,
        erosionRisk: erosionRisk(terrain.get(s.id).slope_median),
      }),
    });
  }
  fs.writeFileSync(path.join("data", "points.json"), JSON.stringify(index, null, 2));

  // Resumen en consola
  const byRain = [...index].filter((p) => p.rainMm != null).sort((a, b) => a.rainMm - b.rainMm);
  console.log(`\nLluvia anual 2016-2025 (IMERG): de ${byRain[0]?.rainMm} mm (${byRain[0]?.name}) a ${byRain.at(-1)?.rainMm} mm (${byRain.at(-1)?.name})`);
  const tally = {};
  for (const p of index) tally[p.soil] = (tally[p.soil] ?? 0) + 1;
  console.log("Suelos:", Object.entries(tally).map(([k, v]) => `${k} ${v}`).join(", "));
  const best = {};
  for (const p of index) if (p.top[0]) best[p.top[0].name] = (best[p.top[0].name] ?? 0) + 1;
  const bestIrr = {};
  for (const p of index) if (p.topIrrigated[0]) bestIrr[p.topIrrigated[0].name] = (bestIrr[p.topIrrigated[0].name] ?? 0) + 1;
  console.log("Cultivo #1 con riego:", Object.entries(bestIrr).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(", "));
  console.log("Cultivo #1 de secano (solo lluvia):", Object.entries(best).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(", "));
  console.log("\nEjemplos (oeste → este):");
  for (const p of index.filter((_, i) => i % Math.max(1, Math.floor(index.length / 6)) === 0))
    console.log(`  ${p.name.padEnd(28)} ${String(p.rainMm).padStart(5)} mm  ${String(p.soil).padEnd(16)} secano: ${p.top.map((t) => `${t.name} ${t.score}`).join(", ")} | riego: ${p.topIrrigated.map((t) => `${t.name} ${t.score}`).join(", ")}`);
  console.log(`\nListo: data/points.json y ${index.length} archivos en data/points/`);
}

main().catch((e) => { console.error(e); process.exit(1); });
