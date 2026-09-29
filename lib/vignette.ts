// Vignettes légères des photos (produits, boutiques, Marché) : l'original reste en
// pleine qualité dans le stockage, les listes affichent une version réduite servie
// par /api/public/vignette et gardée en cache. Utilisable côté serveur et navigateur.

/** Photos publiques de nos espaces Supabase : les seules que l'on accepte de réduire. */
export const VIGNETTE_SOURCE = /^https:\/\/[a-z0-9]+\.supabase\.co\/storage\/v1\/object\/public\//;

/** Largeurs autorisées (en pixels) : limite le nombre de versions gardées en cache. */
export const VIGNETTE_WIDTHS = [128, 256, 512, 1024] as const;

/**
 * Adresse de la version réduite d'une photo, assez large pour `displayWidth` pixels
 * affichés sur un écran haute densité. Toute autre adresse est rendue telle quelle.
 */
export function vignette<T extends string | null | undefined>(url: T, displayWidth: number): T | string {
  if (!url || !VIGNETTE_SOURCE.test(url)) return url;
  const wanted = displayWidth * 2;
  const width = VIGNETTE_WIDTHS.find((w) => w >= wanted) ?? VIGNETTE_WIDTHS[VIGNETTE_WIDTHS.length - 1];
  return `/api/public/vignette?w=${width}&u=${encodeURIComponent(url)}`;
}
