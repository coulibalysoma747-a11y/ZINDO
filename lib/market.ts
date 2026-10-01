/**
 * Nouveau Marché ZINDO (flag nouveau_marche) : constantes partagées entre le
 * serveur et le navigateur. Les lectures en base sont dans lib/market-data.ts.
 */

export const MARKET_FLAG = "nouveau_marche";

/** Le Marché n'a pas de sens pour ces activités (cahier des charges, §14). */
export const MARKET_EXCLUDED_ACTIVITIES = ["ecole"];

/**
 * « Vendeur du Marché » (flag vendeur_marche_seul) : vend seulement sur le
 * Marché, sans caisse ni stock, et ne paie jamais d'abonnement (seulement
 * la mise en avant, par le portefeuille).
 */
export const MARKET_ONLY_ACTIVITY_KEY = "vendeur_marche";
export const MARKET_ONLY_FLAG = "vendeur_marche_seul";

/** Entrées du menu visibles pour un « Vendeur du Marché » : rien d'autre. */
export const MARKET_ONLY_NAV_HREFS = ["/mon-marche", "/produits", "/parametres", "/support"];

/** Pages ouvertes à un « Vendeur du Marché » (les autres le renvoient vers Mon Marché, même en tapant l'adresse). */
const MARKET_ONLY_PATH_PREFIXES = [
  "/mon-marche",
  "/produits",
  "/categories",
  "/marques",
  "/photos-produits",
  "/parametres",
  "/profil",
  "/support",
];

export function isMarketOnlyAllowedPath(pathname: string): boolean {
  return MARKET_ONLY_PATH_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** Catégories communes à tout le Marché, distinctes des catégories propres à chaque commerçant. */
export const MARKET_CATEGORIES = [
  { key: "electronique", label: "Électronique" },
  { key: "telephones", label: "Téléphones" },
  { key: "mode", label: "Mode" },
  { key: "alimentation", label: "Alimentation" },
  { key: "maison", label: "Maison" },
  { key: "beaute", label: "Beauté" },
  { key: "automobile", label: "Automobile" },
  { key: "moto", label: "Moto" },
  { key: "pieces", label: "Pièces détachées" },
  { key: "agriculture", label: "Agriculture" },
  { key: "pro", label: "Matériel professionnel" },
  { key: "services", label: "Services" },
  { key: "autres", label: "Autres" },
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
  viewCount: number;
  /** Note moyenne des avis (1 à 5), null sans avis. */
  rating: number | null;
  reviewCount: number;
  /** Mise en avant payante en cours (badge « Mis en avant »). */
  boosted: boolean;
  /** Monnaie des prix (celle de la boutique). */
  currency: string;
  shop: MarketShopSummary;
};

export type MarketShopSummary = {
  slug: string;
  name: string;
  city: string | null;
  /** Code ISO du pays de la boutique (BF, CI…). */
  countryCode?: string;
  /** Monnaie du commerce (XOF, EUR…) : prix et totaux de la boutique. */
  currency?: string;
  logoUrl: string | null;
  verified: boolean;
  rating: number | null;
  reviewCount: number;
  boosted?: boolean;
};

/** Photos supplémentaires au plus par produit publié (en plus de la photo principale). */
export const MAX_LISTING_PHOTOS = 8;

export const MARKET_SORTS = [
  { key: "recents", label: "Plus récents" },
  { key: "populaires", label: "Plus populaires" },
  { key: "prix-croissant", label: "Prix croissant" },
  { key: "prix-decroissant", label: "Prix décroissant" },
] as const;

export type MarketSort = (typeof MARKET_SORTS)[number]["key"];

export const MARKET_REPORT_REASONS = [
  { key: "INTERDIT", label: "Produit interdit" },
  { key: "FRAUDE", label: "Fraude" },
  { key: "FAUSSE_INFO", label: "Fausse information" },
  { key: "PRIX_TROMPEUR", label: "Prix trompeur" },
  { key: "CONTREFACON", label: "Contrefaçon" },
  { key: "INAPPROPRIE", label: "Contenu inapproprié" },
  { key: "AUTRE", label: "Autre" },
] as const;

export function discountPercent(price: number, promoPrice: number | null): number | null {
  if (promoPrice == null || promoPrice <= 0 || promoPrice >= price) return null;
  // Plafonné à 99 : un arrondi à 100 % laisserait croire que le produit est gratuit.
  return Math.min(99, Math.round(((price - promoPrice) / price) * 100));
}

/** Numéro acheteur ramené à ses chiffres locaux (sans l'indicatif 226) ; null s'il est invalide. */
export function normalizeBuyerPhone(value: string): string | null {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("00226")) digits = digits.slice(5);
  else if (digits.startsWith("226") && digits.length === 11) digits = digits.slice(3);
  return digits.length >= 8 && digits.length <= 15 ? digits : null;
}

/** Page de retour après connexion : uniquement une page du Marché (jamais un site extérieur). */
export function safeMarketRedirect(value: FormDataEntryValue | string | null | undefined): string {
  const target = typeof value === "string" ? value : "";
  return target.startsWith("/marche") && !target.startsWith("//") ? target : "/marche/commandes";
}

/** Statuts d'une commande du Marché, dans l'ordre de la frise de suivi. */
export const MARKET_ORDER_STEPS = [
  { key: "RECUE", label: "Commande reçue" },
  { key: "CONFIRMEE", label: "Confirmée" },
  { key: "PREPARATION", label: "En préparation" },
  { key: "PRETE", label: "Prête" },
  { key: "EN_LIVRAISON", label: "En livraison" },
  { key: "LIVREE", label: "Livrée" },
] as const;

export type MarketOrderStatus = (typeof MARKET_ORDER_STEPS)[number]["key"] | "ANNULEE";

export function marketOrderStatusLabel(status: string): string {
  if (status === "ANNULEE") return "Annulée";
  return MARKET_ORDER_STEPS.find((s) => s.key === status)?.label ?? status;
}

export const MARKET_PAYMENT_LABELS: Record<string, string> = {
  A_LA_LIVRAISON: "Paiement à la livraison",
  AU_RETRAIT: "Paiement au retrait",
  MOBILE_MONEY: "Mobile Money",
};

export function slugifyShopName(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}
