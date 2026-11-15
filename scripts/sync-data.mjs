// Copia los datos de field-shift-data/data a public/data para que la web los sirva.
// Solo copia los puntos que aparecen en points.json (ignora archivos sobrantes).
// Uso:  npm run data
import fs from "node:fs";
import path from "node:path";

const SRC = path.join("field-shift-data", "data");
const DEST = path.join("public", "data");

const index = JSON.parse(fs.readFileSync(path.join(SRC, "points.json"), "utf8"));
fs.rmSync(DEST, { recursive: true, force: true });
fs.mkdirSync(path.join(DEST, "points"), { recursive: true });
for (const p of index) {
  const file = path.join(SRC, "points", `${p.id}.json`);
  fs.copyFileSync(file, path.join(DEST, "points", `${p.id}.json`));
  // Para la capa "Futuro" del mapa: días de mucho calor hoy y hacia 2041-2060 (SSP2-4.5)
  const f = JSON.parse(fs.readFileSync(file, "utf8")).projections?.find((x) => x.key === "ssp245_2041-2060");
  if (f) Object.assign(p, { heatDaysNow: f.heatDaysNow, heatDaysFuture: f.heatDaysFuture });
}
// El índice de la web lleva esos campos extra; el original en field-shift-data no se toca
fs.writeFileSync(path.join(DEST, "points.json"), JSON.stringify(index, null, 2));
console.log(`Listo: ${index.length} puntos copiados a ${DEST}/`);
