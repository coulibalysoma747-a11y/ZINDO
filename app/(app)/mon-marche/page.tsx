import Link from "next/link";
import { redirect } from "next/navigation";
import { ExternalLink, Store } from "lucide-react";
import { hasPermission, requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { getLocations } from "@/lib/location";
import { isMarketEnabledFor } from "@/lib/market-data";
import { slugifyShopName } from "@/lib/market";
import { formatMoney } from "@/lib/format";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { MarketShopForm, type MarketShopFormValues } from "./MarketShopForm";
import { PublishToMarket } from "./PublishToMarket";

const PAGE_SIZE = 50;

/** Mon Marché (flag nouveau_marche) : la boutique du commerçant et la publication de ses produits du stock. */
export default async function MyMarketPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const user = await requirePermission(PERMISSIONS.PRODUCTS_MANAGE);
  if (!(await isMarketEnabledFor(user.businessId, user.business.activityKey))) redirect("/dashboard");
  const { q = "" } = await searchParams;

  const [canEditShop, locations, shopResult] = await Promise.all([
    hasPermission(user.businessId, user.role, PERMISSIONS.SETTINGS_MANAGE, user.id),
    getLocations(user.businessId),
    supabase
      .from("market_shops")
      .select("slug, name, description, logoUrl:logo_url, coverUrl:cover_url, phone, whatsapp, city, address, hours, locationId:location_id, published, " +
          "deliveryEnabled:delivery_enabled, deliveryFee:delivery_fee, deliveryNote:delivery_note, pickupEnabled:pickup_enabled, payOnDelivery:pay_on_delivery, payOnPickup:pay_on_pickup, mobileMoneyEnabled:mobile_money_enabled, orangeMoneyNumber:orange_money_number, moovMoneyNumber:moov_money_number"
      )
      .eq("business_id", user.businessId)
      .maybeSingle(),
  ]);
  const shop = shopResult.data as unknown as MarketShopFormValues | null;
  const activeLocations = locations.filter((l) => l.active);
  const stockLocationId = shop?.locationId ?? null;

  let productQuery = supabase
    .from("products")
    .select("id, name, reference, salePrice:sale_price, photoUrl:photo_url")
    .eq("business_id", user.businessId)
    .eq("active", true);
  const term = q.replace(/[,()%*\\]/g, " ").trim();
  if (term) productQuery = productQuery.or(`name.ilike.%${term}%,reference.ilike.%${term}%,barcode.ilike.%${term}%`);
  const { data: productData } = await productQuery.order("name").limit(PAGE_SIZE);
  const products = (productData ?? []) as { id: string; name: string; reference: string; salePrice: number; photoUrl: string | null }[];
  const ids = products.map((p) => p.id);

  const [{ data: listingData }, { data: stockData }, { count: publishedCount }, { count: newOrders }] = await Promise.all([
    ids.length
      ? supabase.from("market_listings").select("productId:product_id, category:market_category, promoPrice:promo_price, published").in("product_id", ids)
      : Promise.resolve({ data: [] }),
    ids.length
      ? supabase.from("product_stocks").select("productId:product_id, locationId:location_id, quantity").in("product_id", ids)
      : Promise.resolve({ data: [] }),
    supabase.from("market_listings").select("id", { count: "exact", head: true }).eq("business_id", user.businessId).eq("published", true),
    supabase.from("market_orders").select("id", { count: "exact", head: true }).eq("business_id", user.businessId).eq("status", "RECUE"),
  ]);
  const listings = new Map(
    ((listingData ?? []) as { productId: string; category: string; promoPrice: number | null; published: boolean }[]).map((l) => [l.productId, l])
  );
  const stocks = (stockData ?? []) as { productId: string; locationId: string; quantity: number }[];
  const stockOf = (productId: string) =>
    stocks.filter((s) => s.productId === productId && (!stockLocationId || s.locationId === stockLocationId)).reduce((sum, s) => sum + Number(s.quantity), 0);

  const currency = user.business.currency;

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Store className="h-5 w-5 text-zindo-green-600" />
            <h1 className="text-xl font-bold text-zinc-900">Mon Marché</h1>
          </div>
          <p className="text-sm text-zinc-500">
            Publiez vos produits du stock sur le Marché ZINDO : prix et quantités restent synchronisés, rien à recréer.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          {shop && (
            <Link href="/mon-marche/commandes" className="rounded-xl bg-zindo-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-zindo-green-700">
              📋 Commandes{newOrders ? ` (${newOrders} nouvelle${newOrders > 1 ? "s" : ""})` : ""}
            </Link>
          )}
          {shop?.published && (
            <Link href={`/marche/boutique/${shop.slug}`} target="_blank" className="inline-flex items-center gap-1.5 text-sm font-semibold text-zindo-green-700 hover:underline">
              Voir ma boutique <ExternalLink className="h-4 w-4" />
            </Link>
          )}
        </div>
      </div>

      {canEditShop && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-zinc-900">{shop ? "Ma boutique" : "Créer ma boutique"}</h2>
          </CardHeader>
          <CardBody>
            <MarketShopForm
              locations={activeLocations.map((l) => ({ id: l.id, name: l.name }))}
              shop={
                shop ?? {
                  name: user.business.name,
                  slug: slugifyShopName(user.business.name),
                  description: null,
                  logoUrl: user.business.logoUrl,
                  coverUrl: null,
                  phone: user.business.phone,
                  whatsapp: user.business.phone,
                  city: user.business.city,
                  address: user.business.address,
                  hours: null,
                  locationId: null,
                  published: true,
                  deliveryEnabled: false,
                  deliveryFee: 0,
                  deliveryNote: null,
                  pickupEnabled: true,
                  payOnDelivery: true,
                  payOnPickup: true,
                  mobileMoneyEnabled: false,
                  orangeMoneyNumber: null,
                  moovMoneyNumber: null,
                }
              }
            />
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold text-zinc-900">Mes produits ({publishedCount ?? 0} publiés)</h2>
            <form className="flex gap-2">
              <input name="q" defaultValue={q} placeholder="Rechercher un produit…" className="h-9 w-56 rounded-lg border border-zinc-300 px-2 text-sm" />
              <button className="h-9 rounded-lg border border-zinc-300 px-3 text-sm font-medium hover:bg-zinc-50">Chercher</button>
            </form>
          </div>
        </CardHeader>
        <CardBody className="space-y-3">
          {!shop && <p className="text-sm text-amber-700">Créez d&apos;abord votre boutique : vos produits publiés y apparaîtront.</p>}
          {products.length === 0 && <p className="text-sm text-zinc-500">Aucun produit trouvé.</p>}
          {products.map((p) => {
            const listing = listings.get(p.id);
            const available = stockOf(p.id);
            return (
              <div key={p.id} className="flex flex-col gap-2 border-b border-zinc-100 pb-3 last:border-0 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  {p.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.photoUrl} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <div className="h-10 w-10 shrink-0 rounded-lg bg-zinc-100" />
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-900">{p.name}</p>
                    <p className="text-xs text-zinc-500">
                      {formatMoney(p.salePrice, currency)} · {available > 0 ? `${available} en stock` : <span className="text-red-600">Rupture</span>}
                    </p>
                  </div>
                </div>
                <PublishToMarket productId={p.id} salePrice={p.salePrice} initial={listing ?? null} hasPhoto={!!p.photoUrl?.trim()} compact />
              </div>
            );
          })}
          {products.length === PAGE_SIZE && <p className="text-xs text-zinc-500">Seuls les {PAGE_SIZE} premiers produits sont affichés : utilisez la recherche.</p>}
        </CardBody>
      </Card>
    </div>
  );
}
