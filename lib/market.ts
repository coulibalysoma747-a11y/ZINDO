/**
 * Nouveau Marché ZINDO (flag nouveau_marche) : constantes partagées entre le
 * serveur et le navigateur. Les lectures en base sont dans lib/market-data.ts.
 */

export const MARKET_FLAG = "nouveau_marche";

/** Le Marché n'a pas de sens pour ces activités (cahier des charges, §14). */
export const MARKET_EXCLUDED_ACTIVITIES = ["ecole"];

/** Catégories communes à tout le Marché, distinctes des catégories propres à chaque commerçant. */
export const MARKET_CATEGORIES = [
  { key: "electronique", label: "Électronique", emoji: "💻" },
  { key: "telephones", label: "Téléphones", emoji: "📱" },
  { key: "mode", label: "Mode", emoji: "👕" },
  { key: "alimentation", label: "Alimentation", emoji: "🍚" },
  { key: "maison", label: "Maison", emoji: "🏠" },
  { key: "beaute", label: "Beauté", emoji: "💄" },
  { key: "automobile", label: "Automobile", emoji: "🚗" },
  { key: "moto", label: "Moto", emoji: "🏍️" },
  { key: "pieces", label: "Pièces détachées", emoji: "⚙️" },
  { key: "agriculture", label: "Agriculture", emoji: "🌾" },
  { key: "pro", label: "Matériel professionnel", emoji: "🧰" },
  { key: "services", label: "Services", emoji: "🛠️" },
  { key: "autres", label: "Autres", emoji: "📦" },
] as const;

export type MarketCategoryKey = (typeof MARKET_CATEGORIES)[number]["key"];

export function marketCategoryLabel(key: string): string {
  return MARKET_CATEGORIES.find((c) => c.key === key)?.label ?? "Autres";
}

export function isMarketCategory(key: string): key is MarketCategoryKey {
  return MARKET_CATEGORIES.some((c) => c.key === key);
}

/** Produit tel que l'affiche le Marché (prix et quantité lus en direct dans le stock). */
export type MarketProduct = {
  listingId: string;
  productId: string;
  name: string;
  brand: string | null;
  description: string | null;
  unit: string;
  photoUrl: string | null;
  category: string;
  price: number;
  promoPrice: number | null;
  available: number;
  publishedAt: string;
  shop: MarketShopSummary;
};

export type MarketShopSummary = {
  slug: string;
  name: string;
  city: string | null;
  logoUrl: string | null;
  verified: boolean;
};

export function discountPercent(price: number, promoPrice: number | null): number | null {
  if (promoPrice == null || promoPrice <= 0 || promoPrice >= price) return null;
  // Plafonné à 99 : un arrondi à 100 % laisserait croire que le produit est gratuit.
  return Math.min(99, Math.round(((price - promoPrice) / price) * 100));
}

export function slugifyShopName(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}
