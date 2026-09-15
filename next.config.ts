import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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

export default nextConfig;
