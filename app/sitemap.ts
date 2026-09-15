import type { MetadataRoute } from "next";
import { supabase } from "@/lib/supabase";

const BASE_URL = "https://zindo.vercel.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${BASE_URL}/login`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/inscription`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
  ];

  // Vitrines publiques (boutique en ligne des commerçants) publiées — voir
  // app/boutique/[slug]/page.tsx. Best-effort : une erreur ici ne doit pas
  // faire échouer tout le sitemap (les pages statiques restent utiles seules).
  try {
    const { data: stores } = await supabase
      .from("online_stores")
      .select("slug, updatedAt:updated_at")
      .eq("published", true);
    const storeEntries: MetadataRoute.Sitemap = (stores ?? []).map((s) => ({
      url: `${BASE_URL}/boutique/${s.slug}`,
      lastModified: new Date(s.updatedAt as string),
      changeFrequency: "daily",
      priority: 0.5,
    }));
    return [...staticEntries, ...storeEntries];
  } catch (e) {
    console.error("[sitemap] Échec de la récupération des boutiques publiées :", e);
    return staticEntries;
  }
}
