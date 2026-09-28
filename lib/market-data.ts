import "server-only";
import { supabase } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/auth";
import { isFeatureEnabled, isFeatureEnabledGlobally, registerFeatureFlag } from "@/lib/feature-flags";
import { MARKET_EXCLUDED_ACTIVITIES, MARKET_FLAG, type MarketProduct, type MarketShopSummary } from "@/lib/market";

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
  await registerMarketFlag();
  if (await isFeatureEnabledGlobally(MARKET_FLAG)) return true;
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
  createdAt: string;
};

const SHOP_COLUMNS =
  "id, businessId:business_id, locationId:location_id, slug, name, description, logoUrl:logo_url, coverUrl:cover_url, phone, whatsapp, city, address, hours, createdAt:created_at, business:businesses!inner(suspended)";

type ShopRow = Omit<MarketShop, "verified"> & { business: { suspended: boolean } };

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

function toShops(rows: ShopRow[], verified: Set<string>): MarketShop[] {
  return rows
    .filter((r) => !r.business.suspended)
    .map((r) => {
      const { business, ...shop } = r;
      void business;
      return { ...shop, verified: verified.has(shop.businessId) };
    });
}

/** Boutiques publiées (non suspendues), les plus récentes d'abord. */
export async function loadPublishedShops(): Promise<MarketShop[]> {
  const { data, error } = await supabase
    .from("market_shops")
    .select(SHOP_COLUMNS)
    .eq("published", true)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[loadPublishedShops]", error.message);
    return [];
  }
  const rows = (data ?? []) as unknown as ShopRow[];
  return toShops(rows, await verifiedBusinessIds(rows.map((r) => r.businessId)));
}

export async function loadShopBySlug(slug: string): Promise<MarketShop | null> {
  const { data } = await supabase.from("market_shops").select(SHOP_COLUMNS).eq("slug", slug).eq("published", true).maybeSingle();
  if (!data) return null;
  const row = data as unknown as ShopRow;
  return toShops([row], await verifiedBusinessIds([row.businessId]))[0] ?? null;
}

type ListingRow = {
  id: string;
  businessId: string;
  category: string;
  promoPrice: number | null;
  publishedAt: string;
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
  promoOnly?: boolean;
  limit?: number;
};

/** Produits publiés des boutiques données, avec prix et quantité lus en direct. */
export async function loadMarketProducts({ shops, q, category, productId, productIds, promoOnly, limit = 60 }: MarketProductQuery): Promise<MarketProduct[]> {
  if (shops.length === 0) return [];
  const shopByBusiness = new Map(shops.map((s) => [s.businessId, s]));

  let query = supabase
    .from("market_listings")
    .select(
      "id, businessId:business_id, category:market_category, promoPrice:promo_price, publishedAt:published_at, " +
        "product:products!inner(id, name, brand, description, unit, salePrice:sale_price, photoUrl:photo_url)"
    )
    .eq("published", true)
    .eq("product.active", true)
    // Jamais de produit sans photo sur le Marché (règle du propriétaire, 28/09) :
    // « > '' » écarte à la fois NULL et la chaîne vide.
    .gt("product.photo_url", "")
    .in("business_id", [...shopByBusiness.keys()]);
  if (category) query = query.eq("market_category", category);
  if (productId) query = query.eq("product_id", productId);
  if (productIds) query = query.in("product_id", productIds);
  if (promoOnly) query = query.not("promo_price", "is", null);
  // Caractères qui casseraient la syntaxe du filtre or() de PostgREST.
  const term = (q ?? "").replace(/[,()%*\\]/g, " ").trim();
  if (term) query = query.or(`name.ilike.%${term}%,brand.ilike.%${term}%`, { referencedTable: "products" });

  const { data, error } = await query.order("published_at", { ascending: false }).limit(limit);
  if (error) {
    console.error("[loadMarketProducts]", error.message);
    return [];
  }
  const rows = (data ?? []) as unknown as ListingRow[];
  if (rows.length === 0) return [];

  const { data: stockData } = await supabase
    .from("product_stocks")
    .select("productId:product_id, locationId:location_id, quantity")
    .in(
      "product_id",
      rows.map((r) => r.product.id)
    );
  const stocks = (stockData ?? []) as { productId: string; locationId: string; quantity: number }[];

  return rows.map((r) => {
    const shop = shopByBusiness.get(r.businessId)!;
    // Stock du point de vente de la boutique ; sans point de vente choisi, tout le stock du commerce.
    const available = stocks
      .filter((s) => s.productId === r.product.id && (!shop.locationId || s.locationId === shop.locationId))
      .reduce((sum, s) => sum + Number(s.quantity), 0);
    const promo = r.promoPrice != null && r.promoPrice > 0 && r.promoPrice < r.product.salePrice ? r.promoPrice : null;
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
      shop: { slug: shop.slug, name: shop.name, city: shop.city, logoUrl: shop.logoUrl, verified: shop.verified },
    };
  });
}
