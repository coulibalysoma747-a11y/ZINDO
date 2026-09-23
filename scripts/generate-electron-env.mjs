// Lit .env.production (jamais commité) et génère electron/env.generated.ts,
// que electron/main.ts embarque au build pour transmettre les secrets au
// serveur Next.js standalone via variables d'environnement au lancement —
// pas de fichier .env en clair dans le dossier d'installation.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const ENV_FILE = path.join(ROOT, ".env.production");
const OUT_FILE = path.join(ROOT, "electron", "env.generated.ts");

// SUPABASE_SERVICE_ROLE_KEY n'est PLUS embarquée ici — voir la mémoire
// "Electron desktop build" : une clé service_role embarquée contourne toutes
// les policies RLS et donnait accès à TOUS les commerces de la plateforme,
// pas seulement à celui du commerçant installant l'app. L'app Windows obtient
// désormais un jeton Supabase limité à son propre commerce via
// app/api/desktop/login/route.ts (voir lib/supabase.ts
// setDesktopSupabaseClient) — d'où ZINDO_PRODUCTION_URL ci-dessous, qui n'est
// qu'une URL (pas un secret) et non SUPABASE_SERVICE_ROLE_KEY.
const REQUIRED_KEYS = [
  "SESSION_SECRET",
  "ADMIN_SESSION_SECRET",
  "SUPABASE_URL",
  "ZINDO_PRODUCTION_URL",
];

const OPTIONAL_KEYS = [
  // Non utilisée au runtime (Prisma sert seulement au CLI db push/seed — voir
  // lib/supabase.ts) mais transmise si présente, au cas où.
  "DATABASE_URL",
  "DEEPSEEK_API_KEY",
  "ANTHROPIC_API_KEY",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "RESEND_API_KEY",
  "EMAIL_FROM",
];

function parseEnvFile(content) {
  const values = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

if (!existsSync(ENV_FILE)) {
  console.error(
    `[generate-electron-env] Fichier introuvable : ${ENV_FILE}\n` +
      "Créez .env.production (jamais commité, voir .env.example) avec au minimum : " +
      REQUIRED_KEYS.join(", "),
  );
  process.exit(1);
}

const parsed = parseEnvFile(readFileSync(ENV_FILE, "utf8"));

const missing = REQUIRED_KEYS.filter((key) => !parsed[key]);
if (missing.length > 0) {
  console.error(`[generate-electron-env] Valeurs manquantes dans .env.production : ${missing.join(", ")}`);
  process.exit(1);
}

const entries = [...REQUIRED_KEYS, ...OPTIONAL_KEYS].filter((key) => parsed[key]);

const body = entries.map((key) => `  ${key}: ${JSON.stringify(parsed[key])},`).join("\n");

writeFileSync(
  OUT_FILE,
  `// Généré automatiquement par scripts/generate-electron-env.mjs à partir de\n` +
    `// .env.production — ne pas éditer à la main, ne pas commiter (voir .gitignore).\n` +
    `export const DESKTOP_ENV: Record<string, string> = {\n${body}\n};\n`,
  "utf8",
);

console.log(`[generate-electron-env] Écrit ${path.relative(ROOT, OUT_FILE)} (${entries.length} variables).`);
