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
