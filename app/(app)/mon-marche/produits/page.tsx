import Link from "next/link";
import { Plus } from "lucide-react";
import { MARKET_ONLY_ACTIVITY_KEY } from "@/lib/market";
import { PERMISSIONS } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { formatMoney } from "@/lib/format";
import { requireMarketSeller } from "@/lib/market-seller";
import { MarketSellerNav } from "../MarketSellerNav";
import { ProductsTable, type ProductRow } from "./ProductsTable";
import { Pagination, readPage } from "@/components/market/Pagination";

const PAGE_SIZE = 30;
const FILTERS = [
  { key: "", label: "Tous" },
  { key: "publies", label: "Publiés" },
  { key: "non-publies", label: "Non publiés" },
  { key: "sans-photo", label: "Sans photo" },
];

type ListingRow = NonNullable<ProductRow["listing"]> & { productId: string };

/** Produits du stock et leur publication sur le Marché (Mon Marché), page par page. */
export default async function MyMarketProductsPage({ searchParams }: { searchParams: Promise<{ q?: string; filtre?: string; page?: string }> }) {
  const { user, shop, newOrders, unreadMessages } = await requireMarketSeller(PERMISSIONS.PRODUCTS_MANAGE);
  const { q = "", filtre = "", page: pageParam } = await searchParams;
  const page = readPage(pageParam);
  const marketOnly = user.business.activityKey === MARKET_ONLY_ACTIVITY_KEY;

  const { data: allListings } = await supabase
    .from("market_listings")
    .select("id, productId:product_id, category:market_category, promoPrice:promo_price, published, viewCount:view_count, removedByAdmin:removed_by_admin, removedReason:removed_reason")
    .eq("business_id", user.businessId);
  const listings = new Map(((allListings ?? []) as ListingRow[]).map((l) => [l.productId, l]));
  const publishedIds = [...listings.values()].filter((l) => l.published).map((l) => l.productId);

  let query = supabase
    .from("products")
    .select("id, name, reference, salePrice:sale_price, photoUrl:photo_url", { count: "exact" })
    .eq("business_id", user.businessId)
    .eq("active", true);
  const term = q.replace(/[,()%*\\]/g, " ").trim();
  if (term) query = query.or(`name.ilike.%${term}%,reference.ilike.%${term}%,barcode.ilike.%${term}%`);
  if (filtre === "publies") query = publishedIds.length ? query.in("id", publishedIds) : query.eq("id", "__aucun__");
  if (filtre === "non-publies" && publishedIds.length) query = query.not("id", "in", `(${publishedIds.join(",")})`);
  if (filtre === "sans-photo") query = query.or("photo_url.is.null,photo_url.eq.");
  const from = (page - 1) * PAGE_SIZE;
  const { data: productData, count } = await query.order("name").range(from, from + PAGE_SIZE - 1);
  const products = (productData ?? []) as { id: string; name: string; reference: string; salePrice: number; photoUrl: string | null }[];
  const total = count ?? 0;

  const ids = products.map((p) => p.id);
  const listingIds = ids.map((id) => listings.get(id)?.id).filter((id): id is string => !!id);
  const [{ data: stockData }, { data: photoData }, { count: noPhotoCount }, { count: allCount }] = await Promise.all([
    ids.length ? supabase.from("product_stocks").select("productId:product_id, locationId:location_id, quantity").in("product_id", ids) : Promise.resolve({ data: [] }),
    listingIds.length ? supabase.from("market_listing_photos").select("id, listingId:listing_id, url").in("listing_id", listingIds).order("position") : Promise.resolve({ data: [] }),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("business_id", user.businessId).eq("active", true).or("photo_url.is.null,photo_url.eq."),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("business_id", user.businessId).eq("active", true),
  ]);
  const stocks = (stockData ?? []) as { productId: string; locationId: string; quantity: number }[];
  const photos = (photoData ?? []) as { id: string; listingId: string; url: string }[];
  const currency = user.business.currency;

  const rows: ProductRow[] = products.map((p) => {
    const listing = listings.get(p.id) ?? null;
    return {
      id: p.id,
      name: p.name,
      reference: p.reference,
      priceLabel: formatMoney(p.salePrice, currency),
      salePrice: p.salePrice,
      photoUrl: p.photoUrl,
      available: stocks.filter((s) => s.productId === p.id && (!shop?.locationId || s.locationId === shop.locationId)).reduce((sum, s) => sum + Number(s.quantity), 0),
      listing: listing ? { ...listing } : null,
      photos: listing ? photos.filter((ph) => ph.listingId === listing.id).map(({ id, url }) => ({ id, url })) : [],
    };
  });

  // Lien vers la même liste avec un filtre ou une page différente (page 1 : pas de paramètre).
  const hrefWith = (patch: { filtre?: string; page?: number }) => {
    const next = { q, filtre: patch.filtre ?? filtre, page: patch.page ?? page };
    const params = new URLSearchParams();
    if (next.q) params.set("q", next.q);
    if (next.filtre) params.set("filtre", next.filtre);
    if (next.page > 1) params.set("page", String(next.page));
    return `/mon-marche/produits${params.size ? `?${params}` : ""}`;
  };
  const counts: Record<string, number> = { "": allCount ?? 0, publies: publishedIds.length, "non-publies": Math.max(0, (allCount ?? 0) - publishedIds.length), "sans-photo": noPhotoCount ?? 0 };

  return (
    <div className="max-w-5xl space-y-5">
      <MarketSellerNav active="/mon-marche/produits" shop={shop} newOrders={newOrders} unreadMessages={unreadMessages} />
      {!shop && (
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">
          Créez d&apos;abord{" "}
          <Link href="/mon-marche/boutique" className="font-semibold underline">
            votre boutique
          </Link>{" "}
          : vos produits publiés y apparaîtront.
        </p>
      )}
      {marketOnly && (
        <div className="flex justify-end">
          <Link href="/produits/nouveau" className="inline-flex items-center gap-1.5 rounded-xl bg-zindo-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zindo-green-700">
            <Plus className="h-4 w-4" /> Nouveau produit
          </Link>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1.5 overflow-x-auto text-sm">
          {FILTERS.map((f) => (
            <Link
              key={f.key}
              href={hrefWith({ filtre: f.key, page: 1 })}
              className={filtre === f.key ? "shrink-0 rounded-full bg-zinc-900 px-3 py-1.5 font-semibold text-white" : "shrink-0 rounded-full bg-white px-3 py-1.5 text-zinc-700 ring-1 ring-zinc-200"}
            >
              {f.label} ({counts[f.key]})
            </Link>
          ))}
        </div>
        <form className="flex gap-2">
          {filtre && <input type="hidden" name="filtre" value={filtre} />}
          <input name="q" defaultValue={q} placeholder="Nom, référence ou code-barres…" className="h-9 w-60 rounded-lg border border-zinc-300 bg-white px-2 text-sm" />
          <button className="h-9 rounded-lg bg-zinc-900 px-3 text-sm font-medium text-white">Chercher</button>
        </form>
      </div>

      <ProductsTable rows={rows} marketOnly={marketOnly} />

      <Pagination page={page} pageSize={PAGE_SIZE} total={total} href={(n) => hrefWith({ page: n })} noun="produits" />
    </div>
  );
}
