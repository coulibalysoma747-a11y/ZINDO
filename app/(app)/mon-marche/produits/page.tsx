import Link from "next/link";
import { Eye } from "lucide-react";
import { PERMISSIONS } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { formatMoney } from "@/lib/format";
import { requireMarketSeller } from "@/lib/market-seller";
import { MarketSellerNav } from "../MarketSellerNav";
import { PublishToMarket } from "../PublishToMarket";
import { ListingPhotos } from "./ListingPhotos";

const PAGE_SIZE = 50;
const FILTERS = [
  { key: "", label: "Tous" },
  { key: "publies", label: "Publiés" },
  { key: "non-publies", label: "Non publiés" },
  { key: "sans-photo", label: "Sans photo" },
];

/** Produits du stock et leur publication sur le Marché (Mon Marché). */
export default async function MyMarketProductsPage({ searchParams }: { searchParams: Promise<{ q?: string; filtre?: string }> }) {
  const { user, shop, newOrders } = await requireMarketSeller(PERMISSIONS.PRODUCTS_MANAGE);
  const { q = "", filtre = "" } = await searchParams;

  const { data: allListings } = await supabase
    .from("market_listings")
    .select("id, productId:product_id, category:market_category, promoPrice:promo_price, published, viewCount:view_count, removedByAdmin:removed_by_admin, removedReason:removed_reason")
    .eq("business_id", user.businessId);
  const listings = new Map(
    ((allListings ?? []) as {
      id: string;
      productId: string;
      category: string;
      promoPrice: number | null;
      published: boolean;
      viewCount: number;
      removedByAdmin: boolean;
      removedReason: string | null;
    }[]).map((l) => [l.productId, l])
  );
  const publishedIds = [...listings.values()].filter((l) => l.published).map((l) => l.productId);

  let query = supabase.from("products").select("id, name, reference, salePrice:sale_price, photoUrl:photo_url").eq("business_id", user.businessId).eq("active", true);
  const term = q.replace(/[,()%*\\]/g, " ").trim();
  if (term) query = query.or(`name.ilike.%${term}%,reference.ilike.%${term}%,barcode.ilike.%${term}%`);
  if (filtre === "publies") query = publishedIds.length ? query.in("id", publishedIds) : query.eq("id", "__aucun__");
  if (filtre === "non-publies" && publishedIds.length) query = query.not("id", "in", `(${publishedIds.join(",")})`);
  if (filtre === "sans-photo") query = query.or("photo_url.is.null,photo_url.eq.");
  const { data: productData } = await query.order("name").limit(PAGE_SIZE);
  const products = (productData ?? []) as { id: string; name: string; reference: string; salePrice: number; photoUrl: string | null }[];

  const ids = products.map((p) => p.id);
  const listingIds = ids.map((id) => listings.get(id)?.id).filter((id): id is string => !!id);
  const [{ data: stockData }, { data: photoData }, { count: noPhotoCount }] = await Promise.all([
    ids.length ? supabase.from("product_stocks").select("productId:product_id, locationId:location_id, quantity").in("product_id", ids) : Promise.resolve({ data: [] }),
    listingIds.length ? supabase.from("market_listing_photos").select("id, listingId:listing_id, url").in("listing_id", listingIds).order("position") : Promise.resolve({ data: [] }),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("business_id", user.businessId).eq("active", true).or("photo_url.is.null,photo_url.eq."),
  ]);
  const stocks = (stockData ?? []) as { productId: string; locationId: string; quantity: number }[];
  const photos = (photoData ?? []) as { id: string; listingId: string; url: string }[];
  const stockOf = (productId: string) =>
    stocks.filter((s) => s.productId === productId && (!shop?.locationId || s.locationId === shop.locationId)).reduce((sum, s) => sum + Number(s.quantity), 0);
  const currency = user.business.currency;
  const hrefWith = (patch: { q?: string; filtre?: string }) => {
    const params = new URLSearchParams(Object.entries({ q, filtre, ...patch }).filter(([, v]) => v) as [string, string][]);
    return `/mon-marche/produits${params.size ? `?${params}` : ""}`;
  };

  return (
    <div className="max-w-5xl space-y-5">
      <MarketSellerNav active="/mon-marche/produits" shop={shop} newOrders={newOrders} />
      {!shop && (
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">
          Créez d&apos;abord <Link href="/mon-marche/boutique" className="font-semibold underline">votre boutique</Link> : vos produits publiés y apparaîtront.
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1.5 overflow-x-auto text-sm">
          {FILTERS.map((f) => (
            <Link
              key={f.key}
              href={hrefWith({ filtre: f.key })}
              className={filtre === f.key ? "shrink-0 rounded-full bg-zinc-900 px-3 py-1.5 font-semibold text-white" : "shrink-0 rounded-full bg-white px-3 py-1.5 text-zinc-700 ring-1 ring-zinc-200"}
            >
              {f.label}
              {f.key === "publies" ? ` (${publishedIds.length})` : f.key === "sans-photo" ? ` (${noPhotoCount ?? 0})` : ""}
            </Link>
          ))}
        </div>
        <form className="flex gap-2">
          {filtre && <input type="hidden" name="filtre" value={filtre} />}
          <input name="q" defaultValue={q} placeholder="Nom, référence ou code-barres…" className="h-9 w-60 rounded-lg border border-zinc-300 bg-white px-2 text-sm" />
          <button className="h-9 rounded-lg bg-zinc-900 px-3 text-sm font-medium text-white">Chercher</button>
        </form>
      </div>

      <div className="divide-y divide-zinc-100 rounded-2xl bg-white ring-1 ring-zinc-200">
        {products.length === 0 && <p className="p-6 text-center text-sm text-zinc-500">Aucun produit.</p>}
        {products.map((p) => {
          const listing = listings.get(p.id);
          const available = stockOf(p.id);
          return (
            <div key={p.id} className="space-y-2 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  {p.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.photoUrl} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover ring-1 ring-zinc-200" />
                  ) : (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-xs text-zinc-400">Photo ?</div>
                  )}
                  <div className="min-w-0">
                    <Link href={`/produits/${p.id}`} className="truncate text-sm font-semibold text-zinc-900 hover:underline">
                      {p.name}
                    </Link>
                    <p className="text-xs text-zinc-500">
                      {p.reference} · {formatMoney(p.salePrice, currency)} ·{" "}
                      {available > 0 ? `${available} en stock` : <span className="font-semibold text-red-600">Rupture</span>}
                    </p>
                    {listing?.published && (
                      <p className="flex items-center gap-1 text-xs text-zinc-500">
                        <Eye className="h-3.5 w-3.5" /> {listing.viewCount} vue{listing.viewCount > 1 ? "s" : ""}
                      </p>
                    )}
                  </div>
                </div>
                <PublishToMarket productId={p.id} salePrice={p.salePrice} initial={listing ?? null} hasPhoto={!!p.photoUrl?.trim()} compact />
              </div>
              {listing?.removedByAdmin && (
                <p className="rounded-lg bg-red-50 p-2 text-xs text-red-800">⛔ Retiré du Marché par ZINDO{listing.removedReason ? ` : ${listing.removedReason}` : ""}.</p>
              )}
              {listing?.published && <ListingPhotos listingId={listing.id} photos={photos.filter((ph) => ph.listingId === listing.id)} />}
            </div>
          );
        })}
      </div>
      {products.length === PAGE_SIZE && <p className="text-xs text-zinc-500">Seuls les {PAGE_SIZE} premiers produits sont affichés : utilisez la recherche.</p>}
    </div>
  );
}
