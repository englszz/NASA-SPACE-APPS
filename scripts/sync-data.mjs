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
fs.copyFileSync(path.join(SRC, "points.json"), path.join(DEST, "points.json"));
for (const p of index) {
  fs.copyFileSync(path.join(SRC, "points", `${p.id}.json`), path.join(DEST, "points", `${p.id}.json`));
}
console.log(`Listo: ${index.length} puntos copiados a ${DEST}/`);
