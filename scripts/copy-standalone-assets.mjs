// `next build` avec output: "standalone" produit .next/standalone/server.js
// mais omet volontairement .next/static et public/ (documenté par Next.js) —
// on les recopie pour que le serveur embarqué dans l'appli Windows puisse
// servir les assets statiques et les fichiers publics sans réseau.
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const STANDALONE = path.join(ROOT, ".next", "standalone");

if (!existsSync(STANDALONE)) {
  console.error("[copy-standalone-assets] .next/standalone introuvable — lancez `next build` d'abord.");
  process.exit(1);
}

const copies = [
  [path.join(ROOT, ".next", "static"), path.join(STANDALONE, ".next", "static")],
  [path.join(ROOT, "public"), path.join(STANDALONE, "public")],
];

for (const [from, to] of copies) {
  if (!existsSync(from)) continue;
  mkdirSync(path.dirname(to), { recursive: true });
  cpSync(from, to, { recursive: true });
  console.log(`[copy-standalone-assets] ${path.relative(ROOT, from)} -> ${path.relative(ROOT, to)}`);
}
