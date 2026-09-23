import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const nextConfig: NextConfig = {
  // Requis pour empaqueter un serveur Node autonome dans l'application
  // Windows (Electron lance .next/standalone/server.js) — voir electron/main.ts
  // et le script "build:desktop" (package.json). Conditionné à
  // ZINDO_BUILD_TARGET=desktop : ce mode casse le pipeline de build de Vercel
  // (celui-ci gère lui-même le découpage serverless et échoue sur les traces
  // manquantes quand "standalone" est actif), donc il ne doit jamais être
  // actif sur le déploiement web.
  ...(process.env.ZINDO_BUILD_TARGET === "desktop" ? { output: "standalone" as const } : {}),
  experimental: {
    // Par défaut Next.js limite le corps des Server Actions à 1 Mo — trop
    // petit pour un catalogue PDF fournisseur avec photos (import de
    // catalogue, voir app/(app)/produits/importer). Vercel plafonne lui-même
    // les fonctions à ~4,5 Mo : on reste prudemment sous cette limite.
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: true,
  widenClientFileUpload: true,
});
