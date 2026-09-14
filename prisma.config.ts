import { defineConfig } from "prisma/config";

try {
  process.loadEnvFile(".env.local");
} catch {
  // .env.local absent — les variables sont déjà fournies par l'environnement
}

// Les commandes CLI (db push, migrate, studio) utilisent la connexion directe
// (DIRECT_URL, non poolée) — nécessaire pour les opérations DDL sur Supabase.
// L'application elle-même (lib/prisma.ts) utilise DATABASE_URL (poolée via
// pgbouncer), adaptée aux nombreuses connexions courtes des fonctions
// serverless Vercel. En local avec une seule base Postgres, les deux
// variables peuvent pointer vers la même URL.
//
// `prisma generate` (exécuté au build, y compris sur Vercel via `npm run
// build`) n'a besoin que du schéma — jamais d'une connexion réelle. On évite
// donc le helper `env()` qui lève une erreur si la variable est absente : ça
// ferait échouer le build sur une plateforme qui ne configure que
// DATABASE_URL (ou aucune des deux, le temps de la migration vers le client
// Supabase direct). Seules les commandes DDL (`db push`, `migrate`,
// `studio`) ont réellement besoin que cette valeur pointe vers une base
// valide.
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DIRECT_URL || process.env.DATABASE_URL || "postgresql://unset",
  },
});
