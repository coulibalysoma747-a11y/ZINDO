import type { MetadataRoute } from "next";

const BASE_URL = "https://zindo.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/login", "/inscription", "/mot-de-passe-oublie", "/boutique/"],
      disallow: [
        "/dashboard",
        "/produits",
        "/stock",
        "/ventes",
        "/achats",
        "/clients",
        "/fournisseurs",
        "/credits",
        "/depenses",
        "/historique",
        "/rapports",
        "/inventaire",
        "/transferts",
        "/categories",
        "/boutiques",
        "/utilisateurs",
        "/parametres",
        "/profil",
        "/abonnement",
        "/support",
        "/boutique-en-ligne",
        "/assistant",
        "/admin",
        "/api",
        "/verifier",
        "/compte-suspendu",
        "/choisir-activite",
      ],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
