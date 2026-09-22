import type { MetadataRoute } from "next";

const BASE_URL = "https://www.zindo.site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/login", "/inscription", "/mot-de-passe-oublie", "/boutique/", "/en", "/en/login", "/en/inscription"],
      disallow: [
        "/dashboard",
        "/produits",
        "/stock",
        "/ventes",
        "/vente-engin",
        "/devis",
        "/immatriculation-engins",
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
