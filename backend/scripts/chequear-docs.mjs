// Falla si hay una ruta en el codigo que no aparece en docs/API.md.
//
// Existe porque la doc se quedo un mes atras sin que nadie lo notara: entre el
// 10/8 y el 15/9 entraron 19 rutas y no se documento ninguna. Ahora es un
// comando que se corre antes de commitear un cambio de endpoints.
//
//   npm run docs:check
//
// ponytail: solo mira que la ruta este en la tabla (metodo + path), no que el
// body o la respuesta documentados sigan siendo ciertos. Eso lo sigue cuidando
// quien hace el cambio.

import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const RUTAS = fileURLToPath(new URL("../src/routes/", import.meta.url));
const doc = readFileSync(new URL("../../docs/API.md", import.meta.url), "utf8");

const faltan = [];
let total = 0;

for (const archivo of readdirSync(RUTAS)) {
  const base = archivo.replace(".routes.ts", "");
  const codigo = readFileSync(RUTAS + archivo, "utf8");

  for (const [, metodo, path] of codigo.matchAll(/router\.(get|post|put|patch|delete)\("([^"]*)"/g)) {
    total++;
    const completa = `/api/${base}${path}`.replace(/\/$/, "");
    if (!doc.includes(`| ${metodo.toUpperCase()} | \`${completa}\``)) {
      faltan.push(`${metodo.toUpperCase()} ${completa}`);
    }
  }
}

if (faltan.length) {
  console.error(`docs/API.md no documenta ${faltan.length} de ${total} rutas:`);
  for (const r of faltan) console.error(`  ${r}`);
  process.exit(1);
}

console.log(`docs/API.md documenta las ${total} rutas.`);
