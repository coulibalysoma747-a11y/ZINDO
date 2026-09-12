import { defineConfig, env } from "prisma/config";

try {
  process.loadEnvFile(".env");
} catch {
  // .env absent — les variables sont déjà fournies par l'environnement
}

// Les commandes CLI (db push, migrate, studio) utilisent la connexion directe
// (DIRECT_URL, non poolée) — nécessaire pour les opérations DDL sur Supabase.
// L'application elle-même (lib/prisma.ts) utilise DATABASE_URL (poolée via
// pgbouncer), adaptée aux nombreuses connexions courtes des fonctions
// serverless Vercel. En local avec une seule base Postgres, les deux
// variables peuvent pointer vers la même URL.
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DIRECT_URL"),
  },
});
