import type { MetadataRoute } from "next";
import { supabase } from "@/lib/supabase";
import { SEO_PAGES } from "@/lib/seo-pages";

const BASE_URL = "https://www.zindo.site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${BASE_URL}/login`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/inscription`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/fonctionnalites`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    ...SEO_PAGES.map((p) => ({
      url: `${BASE_URL}/fonctionnalites/${p.slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    { url: `${BASE_URL}/cgu`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/confidentialite`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    // Version anglaise (voir app/en/).
    { url: `${BASE_URL}/en`, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${BASE_URL}/en/login`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/en/inscription`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/en/cgu`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/en/confidentialite`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
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
