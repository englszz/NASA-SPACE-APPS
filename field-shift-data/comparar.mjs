// Comprueba que los datos de antes no cambiaron al agregar campos nuevos.
// Uso:  cp data/points.json points.antes.json   (antes de cambiar nada)
//       node build-grid.mjs
//       node comparar.mjs
import fs from "node:fs";

const NUEVOS = ["slopePct", "erosionRisk"];
const antes = JSON.parse(fs.readFileSync("points.antes.json", "utf8"));
const ahora = JSON.parse(fs.readFileSync("data/points.json", "utf8"));
const sinNuevos = (p) => Object.fromEntries(Object.entries(p).filter(([k]) => !NUEVOS.includes(k)));
const iguales =
  antes.length === ahora.length &&
  antes.every((p, i) => JSON.stringify(sinNuevos(p)) === JSON.stringify(sinNuevos(ahora[i])));

console.log(iguales ? "✅ Los datos de antes no cambiaron" : "⚠️ Algo cambió: no hagas commit");
const riesgo = {};
for (const p of ahora) riesgo[p.erosionRisk ?? "sin dato"] = (riesgo[p.erosionRisk ?? "sin dato"] ?? 0) + 1;
console.log("Riesgo de erosión:", riesgo);
process.exit(iguales ? 0 : 1);
