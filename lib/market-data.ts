import "server-only";
import { cache } from "react";
import { supabase } from "@/lib/supabase";
import { memo } from "@/lib/memo";
import { getCurrentUser } from "@/lib/auth";
import { isFeatureEnabled, isFeatureEnabledGlobally, registerFeatureFlag } from "@/lib/feature-flags";
import { MARKET_EXCLUDED_ACTIVITIES, MARKET_FLAG, type MarketProduct, type MarketShopSummary, type MarketSort } from "@/lib/market";

/**
 * Lectures du nouveau Marché ZINDO (flag nouveau_marche). Le prix vient de
 * products, la quantité de product_stocks au point de vente de la boutique :
 * rien n'est recopié, le Marché suit toujours le stock réel.
 */

export async function registerMarketFlag() {
  await registerFeatureFlag(
    MARKET_FLAG,
    "Nouveau Marché ZINDO",
    "Marché général + page boutique par vendeur, produits publiés depuis le stock (prix et quantité synchronisés)."
  );
}

/** Le commerce connecté peut-il utiliser le Marché (flag actif, activité compatible) ? */
export async function isMarketEnabledFor(businessId: string, activityKey: string | null | undefined): Promise<boolean> {
  if (activityKey && MARKET_EXCLUDED_ACTIVITIES.includes(activityKey)) return false;
  await registerMarketFlag();
  return isFeatureEnabled(MARKET_FLAG, businessId);
}

/**
 * Les pages publiques /marche sont ouvertes à tous une fois le flag activé
 * globalement ; avant cela, seul un commerçant connecté qui a le flag les voit
 * (pour tester sans rien montrer au public).
 */
export async function canViewMarket(): Promise<boolean> {
  // Flag global gardé 60 s en mémoire : lu à chaque page publique du Marché.
  const open = await memo("marche:flag-global", 60_000, async () => {
    await registerMarketFlag();
    return isFeatureEnabledGlobally(MARKET_FLAG);
  });
  if (open) return true;
  const user = await getCurrentUser();
  return !!user && (await isFeatureEnabled(MARKET_FLAG, user.businessId));
}

export type MarketShop = MarketShopSummary & {
  id: string;
  businessId: string;
  locationId: string | null;
  description: string | null;
  coverUrl: string | null;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  hours: string | null;
  deliveryEnabled: boolean;
  deliveryFee: number;
  deliveryNote: string | null;
  pickupEnabled: boolean;
  createdAt: string;
};

const SHOP_COLUMNS =
  "id, businessId:business_id, locationId:location_id, slug, name, description, logoUrl:logo_url, coverUrl:cover_url, phone, whatsapp, city, address, hours, " +
  "deliveryEnabled:delivery_enabled, deliveryFee:delivery_fee, deliveryNote:delivery_note, pickupEnabled:pickup_enabled, createdAt:created_at, business:businesses!inner(suspended)";

type ShopRow = Omit<MarketShop, "verified" | "rating" | "reviewCount"> & { business: { suspended: boolean } };

async function verifiedBusinessIds(businessIds: string[]): Promise<Set<string>> {
  if (businessIds.length === 0) return new Set();
  const { data } = await supabase
    .from("market_verifications")
    .select("businessId:business_id, packPaidUntil:pack_paid_until")
    .in("business_id", businessIds)
    .eq("status", "VALIDEE");
  const now = Date.now();
  return new Set(
    ((data ?? []) as { businessId: string; packPaidUntil: string | null }[])
      .filter((v) => !v.packPaidUntil || new Date(v.packPaidUntil).getTime() > now)
      .map((v) => v.businessId)
  );
}

type Ratings = Map<string, { rating: number; count: number }>;

/** Moyenne des avis visibles, par boutique ou par produit. */
async function loadRatings(column: "shop_id" | "product_id", ids: string[]): Promise<Ratings> {
  const result: Ratings = new Map();
  if (ids.length === 0) return result;
  const { data } = await supabase.from("market_reviews").select(`key:${column}, rating`).in(column, ids).eq("hidden", false);
  for (const row of (data ?? []) as unknown as { key: string; rating: number }[]) {
    const current = result.get(row.key) ?? { rating: 0, count: 0 };
    result.set(row.key, { rating: current.rating + row.rating, count: current.count + 1 });
  }
  for (const [key, value] of result) result.set(key, { rating: Math.round((value.rating / value.count) * 10) / 10, count: value.count });
  return result;
}

async function toShops(rows: ShopRow[]): Promise<MarketShop[]> {
  const visible = rows.filter((r) => !r.business.suspended);
  const [verified, ratings, boosts] = await Promise.all([
    verifiedBusinessIds(visible.map((r) => r.businessId)),
    loadRatings("shop_id", visible.map((r) => r.id)),
    loadActiveBoosts(),
  ]);
  return visible.map((r) => {
    const { business, ...shop } = r;
    void business;
    const rating = ratings.get(shop.id);
    return { ...shop, verified: verified.has(shop.businessId), rating: rating?.rating ?? null, reviewCount: rating?.count ?? 0, boosted: boosts.shopIds.has(shop.id) };
  });
}

/** Boutiques publiées (ni le commerce ni la boutique suspendus), les plus récentes d'abord. */
export async function loadPublishedShops(): Promise<MarketShop[]> {
  // Liste commune à tous les visiteurs : gardée 30 s en mémoire (voir lib/memo.ts).
  return memo("marche:shops", 30_000, loadPublishedShopsFromDb);
}

async function loadPublishedShopsFromDb(): Promise<MarketShop[]> {
  const { data, error } = await supabase
    .from("market_shops")
    .select(SHOP_COLUMNS)
    .eq("published", true)
    .eq("suspended", false)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[loadPublishedShops]", error.message);
    return [];
  }
  return toShops((data ?? []) as unknown as ShopRow[]);
}

export async function loadShopBySlug(slug: string): Promise<MarketShop | null> {
  const { data } = await supabase.from("market_shops").select(SHOP_COLUMNS).eq("slug", slug).eq("published", true).eq("suspended", false).maybeSingle();
  if (!data) return null;
  return (await toShops([data as unknown as ShopRow]))[0] ?? null;
}

type ListingRow = {
  id: string;
  businessId: string;
  category: string;
  promoPrice: number | null;
  publishedAt: string;
  viewCount: number;
  product: {
    id: string;
    name: string;
    brand: string | null;
    description: string | null;
    unit: string;
    salePrice: number;
    photoUrl: string | null;
  };
};

export type MarketProductQuery = {
  shops: MarketShop[];
  q?: string;
  category?: string;
  productId?: string;
  productIds?: string[];
  listingIds?: string[];
  promoOnly?: boolean;
  inStockOnly?: boolean;
  minPrice?: number;
  maxPrice?: number;
  sort?: MarketSort;
  /** Place les produits mis en avant en tête (pages de recherche). */
  boostFirst?: boolean;
  limit?: number;
};

/** Produits publiés des boutiques données, avec prix, quantité et notes lus en direct. */
export async function loadMarketProducts({
  shops,
  q,
  category,
  productId,
  productIds,
  listingIds,
  promoOnly,
  inStockOnly,
  minPrice,
  maxPrice,
  sort = "recents",
  boostFirst = false,
  limit = 60,
}: MarketProductQuery): Promise<MarketProduct[]> {
  if (shops.length === 0) return [];
  const shopByBusiness = new Map(shops.map((s) => [s.businessId, s]));
  // Filtres de prix et de stock appliqués après lecture (prix promo, stock par point de vente) :
  // on lit plus large pour garder assez de résultats.
  const filtersAfter = inStockOnly || minPrice != null || maxPrice != null || sort.startsWith("prix");
  const fetchLimit = filtersAfter ? Math.max(limit * 4, 200) : limit;

  let query = supabase
    .from("market_listings")
    .select(
      "id, businessId:business_id, category:market_category, promoPrice:promo_price, publishedAt:published_at, viewCount:view_count, " +
        "product:products!inner(id, name, brand, description, unit, salePrice:sale_price, photoUrl:photo_url)"
    )
    .eq("published", true)
    .eq("removed_by_admin", false)
    .eq("product.active", true)
    // Jamais de produit sans photo sur le Marché (règle du propriétaire, 28/09) :
    // « > '' » écarte à la fois NULL et la chaîne vide.
    .gt("product.photo_url", "")
    .in("business_id", [...shopByBusiness.keys()]);
  if (category) query = query.eq("market_category", category);
  if (productId) query = query.eq("product_id", productId);
  if (productIds) query = query.in("product_id", productIds);
  if (listingIds) query = query.in("id", listingIds);
  if (promoOnly) query = query.not("promo_price", "is", null);
  // Caractères qui casseraient la syntaxe du filtre or() de PostgREST.
  const term = (q ?? "").replace(/[,()%*\\]/g, " ").trim();
  if (term) query = query.or(`name.ilike.%${term}%,brand.ilike.%${term}%`, { referencedTable: "products" });
  query = sort === "populaires" ? query.order("view_count", { ascending: false }) : query.order("published_at", { ascending: false });

  const { data, error } = await query.limit(fetchLimit);
  if (error) {
    console.error("[loadMarketProducts]", error.message);
    return [];
  }
  const rows = (data ?? []) as unknown as ListingRow[];
  if (rows.length === 0) return [];

  const productIdsFound = rows.map((r) => r.product.id);
  const [{ data: stockData }, ratings, boosts] = await Promise.all([
    supabase.from("product_stocks").select("productId:product_id, locationId:location_id, quantity").in("product_id", productIdsFound),
    loadRatings("product_id", productIdsFound),
    loadActiveBoosts(),
  ]);
  const stocks = (stockData ?? []) as { productId: string; locationId: string; quantity: number }[];

  let products: MarketProduct[] = rows.map((r) => {
    const shop = shopByBusiness.get(r.businessId)!;
    // Stock du point de vente de la boutique ; sans point de vente choisi, tout le stock du commerce.
    const available = stocks
      .filter((s) => s.productId === r.product.id && (!shop.locationId || s.locationId === shop.locationId))
      .reduce((sum, s) => sum + Number(s.quantity), 0);
    const promo = r.promoPrice != null && r.promoPrice > 0 && r.promoPrice < r.product.salePrice ? r.promoPrice : null;
    const rating = ratings.get(r.product.id);
    return {
      listingId: r.id,
      productId: r.product.id,
      name: r.product.name,
      brand: r.product.brand,
      description: r.product.description,
      unit: r.product.unit,
      photoUrl: r.product.photoUrl,
      category: r.category,
      price: r.product.salePrice,
      promoPrice: promo,
      available: Math.max(0, available),
      publishedAt: r.publishedAt,
      viewCount: r.viewCount,
      rating: rating?.rating ?? null,
      reviewCount: rating?.count ?? 0,
      boosted: boosts.listingIds.has(r.id),
      shop: { slug: shop.slug, name: shop.name, city: shop.city, logoUrl: shop.logoUrl, verified: shop.verified, rating: shop.rating, reviewCount: shop.reviewCount },
    };
  });

  const effective = (p: MarketProduct) => p.promoPrice ?? p.price;
  if (inStockOnly) products = products.filter((p) => p.available > 0);
  if (minPrice != null) products = products.filter((p) => effective(p) >= minPrice);
  if (maxPrice != null) products = products.filter((p) => effective(p) <= maxPrice);
  if (sort === "prix-croissant") products.sort((a, b) => effective(a) - effective(b));
  if (sort === "prix-decroissant") products.sort((a, b) => effective(b) - effective(a));
  // Produits mis en avant en premier (tri stable : l’ordre choisi est gardé entre eux).
  if (boostFirst) products.sort((a, b) => Number(b.boosted) - Number(a.boosted));
  return products.slice(0, limit);
}

/** Photos supplémentaires d'un produit publié (galerie de la fiche produit). */
export async function loadListingPhotos(listingId: string): Promise<string[]> {
  const { data } = await supabase.from("market_listing_photos").select("url").eq("listing_id", listingId).order("position");
  return (data ?? []).map((p) => p.url as string);
}

export type MarketReview = { id: string; rating: number; comment: string | null; buyerName: string; productName: string; createdAt: string };

/** Derniers avis visibles d'un produit ou d'une boutique. */
export async function loadReviews(filter: { productId?: string; shopId?: string }, limit = 20): Promise<MarketReview[]> {
  let query = supabase
    .from("market_reviews")
    .select("id, rating, comment, createdAt:created_at, buyer:market_buyers(name), product:products(name)")
    .eq("hidden", false)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (filter.productId) query = query.eq("product_id", filter.productId);
  if (filter.shopId) query = query.eq("shop_id", filter.shopId);
  const { data } = await query;
  return ((data ?? []) as unknown as { id: string; rating: number; comment: string | null; createdAt: string; buyer: { name: string } | null; product: { name: string } | null }[]).map((r) => ({
    id: r.id,
    rating: r.rating,
    comment: r.comment,
    // Prénom seulement : le nom complet de l'acheteur n'est jamais affiché publiquement.
    buyerName: (r.buyer?.name ?? "Client").split(" ")[0],
    productName: r.product?.name ?? "",
    createdAt: r.createdAt,
  }));
}

/** Compte une visite (produit ou boutique) pour la popularité et les statistiques du vendeur. */
export async function recordMarketView(target: { listingId?: string; shopId?: string }) {
  const { error } = await supabase.rpc("market_record_view", { p_listing_id: target.listingId ?? null, p_shop_id: target.shopId ?? null });
  if (error) console.error("[recordMarketView]", error.message);
}

/** Mises en avant payantes en cours (produits et boutiques), lues une fois par requête. */
export const loadActiveBoosts = cache((): Promise<{ listingIds: Set<string>; shopIds: Set<string> }> => memo("marche:boosts", 30_000, loadActiveBoostsFromDb));

async function loadActiveBoostsFromDb(): Promise<{ listingIds: Set<string>; shopIds: Set<string> }> {
  const { data } = await supabase
    .from("market_boosts")
    .select("listingId:listing_id, shopId:shop_id")
    .lte("starts_at", new Date().toISOString())
    .gt("ends_at", new Date().toISOString());
  const rows = (data ?? []) as { listingId: string | null; shopId: string | null }[];
  return {
    listingIds: new Set(rows.flatMap((r) => (r.listingId ? [r.listingId] : []))),
    shopIds: new Set(rows.flatMap((r) => (r.shopId ? [r.shopId] : []))),
  };
}
