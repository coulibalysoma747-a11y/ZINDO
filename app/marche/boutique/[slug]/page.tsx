import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, Clock, MapPin, MessageCircle, Phone, Store, Truck } from "lucide-react";
import { loadMarketProducts, loadReviews, loadShopBySlug, recordMarketView } from "@/lib/market-data";
import { getBuyerFavorites, getCurrentBuyer } from "@/lib/market-buyer";
import { formatDateTime, formatMoney } from "@/lib/format";
import { MarketProductGrid } from "@/components/market/MarketProductCard";
import { ShopLogo } from "@/components/market/ShopChip";
import { FavoriteButton } from "@/components/market/FavoriteButton";
import { ReportButton } from "@/components/market/ReportButton";
import { ShareButton } from "@/components/market/ShareButton";
import { ContactSellerButton } from "@/components/market/ContactSellerButton";
import { StarRow, Stars } from "@/components/market/Stars";

export const dynamic = "force-dynamic";

const TABS = [
  { key: "produits", label: "Produits" },
  { key: "avis", label: "Avis" },
  { key: "infos", label: "Informations" },
] as const;

/** Page publique d'une boutique du Marché. */
export default async function MarketShopPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ q?: string; onglet?: string }> }) {
  const { slug } = await params;
  const { q = "", onglet = "produits" } = await searchParams;
  const shop = await loadShopBySlug(slug);
  if (!shop) notFound();

  const [products, reviews, favorites, buyer] = await Promise.all([
    loadMarketProducts({ shops: [shop], q, limit: 200 }),
    loadReviews({ shopId: shop.id }, 30),
    getBuyerFavorites(),
    getCurrentBuyer(),
    recordMarketView({ shopId: shop.id }),
  ]);
  const whatsappDigits = shop.whatsapp?.replace(/\D/g, "") ?? "";
  const tab = TABS.some((t) => t.key === onglet) ? onglet : "produits";

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-3xl bg-white ring-1 ring-zinc-200">
        <div className="h-32 bg-gradient-to-br from-zindo-green-600 to-zindo-green-900 sm:h-52">
          {shop.coverUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shop.coverUrl} alt="" className="h-full w-full object-cover" />
          )}
        </div>
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-end sm:justify-between sm:p-6">
          <div className="flex items-end gap-4">
            <div className="-mt-14 shrink-0 rounded-full bg-white p-1 shadow sm:-mt-20">
              <ShopLogo shop={shop} size={88} />
            </div>
            <div className="min-w-0 space-y-1">
              <h1 className="flex items-center gap-1.5 text-xl font-bold text-zinc-900 sm:text-2xl">
                <span className="truncate">{shop.name}</span>
                {shop.verified && <BadgeCheck className="h-5 w-5 shrink-0 text-sky-600" aria-label="Vendeur vérifié" />}
              </h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-600">
                <Stars rating={shop.rating} count={shop.reviewCount} size="md" />
                {shop.city && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" /> {shop.city}
                  </span>
                )}
                <span>{products.length} produits</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <FavoriteButton shopId={shop.id} initial={favorites.shopIds.has(shop.id)} variant="follow" />
            <ContactSellerButton
              shopId={shop.id}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-zindo-green-600 px-4 text-sm font-semibold text-white hover:bg-zindo-green-700 disabled:opacity-50"
            />
            {buyer && (
              <>
                {whatsappDigits && (
                  <a
                    href={`https://wa.me/${whatsappDigits.length === 8 ? `226${whatsappDigits}` : whatsappDigits}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#25D366] px-4 text-sm font-semibold text-white hover:opacity-90"
                  >
                    <MessageCircle className="h-4 w-4" /> WhatsApp
                  </a>
                )}
                {shop.phone && (
                  <a href={`tel:${shop.phone}`} className="inline-flex h-10 items-center gap-2 rounded-xl border border-zinc-300 px-4 text-sm font-semibold text-zinc-800 hover:bg-zinc-50">
                    <Phone className="h-4 w-4" /> Appeler
                  </a>
                )}
              </>
            )}
            <ShareButton title={shop.name} />
          </div>
        </div>
        <nav className="flex border-t border-zinc-100 px-2 sm:px-4">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={`/marche/boutique/${shop.slug}?onglet=${t.key}`}
              className={
                tab === t.key
                  ? "border-b-2 border-zindo-green-600 px-4 py-3 text-sm font-semibold text-zindo-green-800"
                  : "border-b-2 border-transparent px-4 py-3 text-sm font-medium text-zinc-500 hover:text-zinc-800"
              }
            >
              {t.label}
              {t.key === "avis" && shop.reviewCount > 0 ? ` (${shop.reviewCount})` : ""}
            </Link>
          ))}
        </nav>
      </div>

      {tab === "produits" && (
        <section className="space-y-4">
          <form className="flex max-w-md gap-2">
            <input type="hidden" name="onglet" value="produits" />
            <input name="q" defaultValue={q} placeholder="Chercher dans la boutique…" className="h-10 min-w-0 flex-1 rounded-xl border border-zinc-300 bg-white px-3 text-sm" />
            <button className="h-10 rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white">Chercher</button>
          </form>
          {products.length > 0 ? (
            <MarketProductGrid products={products} favorites={favorites.listingIds} />
          ) : (
            <p className="rounded-2xl bg-white p-8 text-center text-sm text-zinc-500 ring-1 ring-zinc-200">Aucun produit trouvé.</p>
          )}
        </section>
      )}

      {tab === "avis" && (
        <section className="rounded-2xl bg-white p-5 ring-1 ring-zinc-200">
          {reviews.length === 0 ? (
            <p className="text-sm text-zinc-500">Pas encore d&apos;avis sur cette boutique.</p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {reviews.map((r) => (
                <li key={r.id} className="space-y-1 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <StarRow rating={r.rating} />
                    <span className="text-sm font-semibold text-zinc-800">{r.buyerName}</span>
                    <span className="text-xs text-zinc-400">
                      {r.productName} · {formatDateTime(r.createdAt)}
                    </span>
                  </div>
                  {r.comment && <p className="text-sm text-zinc-700">{r.comment}</p>}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {tab === "infos" && (
        <section className="space-y-4 rounded-2xl bg-white p-5 ring-1 ring-zinc-200">
          {shop.description && <p className="whitespace-pre-line text-sm leading-relaxed text-zinc-700">{shop.description}</p>}
          <ul className="space-y-3 text-sm text-zinc-700">
            {(shop.address || shop.city) && (
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-zindo-green-700" /> {[shop.address, shop.city].filter(Boolean).join(", ")}
              </li>
            )}
            {shop.hours && (
              <li className="flex items-start gap-2">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-zindo-green-700" /> {shop.hours}
              </li>
            )}
            {shop.deliveryEnabled && (
              <li className="flex items-start gap-2">
                <Truck className="mt-0.5 h-4 w-4 shrink-0 text-zindo-green-700" />
                Livraison {shop.deliveryFee > 0 ? formatMoney(shop.deliveryFee) : "gratuite"}
                {shop.deliveryNote ? ` · ${shop.deliveryNote}` : ""}
              </li>
            )}
            {shop.pickupEnabled && (
              <li className="flex items-start gap-2">
                <Store className="mt-0.5 h-4 w-4 shrink-0 text-zindo-green-700" /> Retrait en boutique
              </li>
            )}
            <li className="text-xs text-zinc-500">Sur le Marché ZINDO depuis le {formatDateTime(shop.createdAt).split(" ")[0]}</li>
          </ul>
          <ReportButton shopId={shop.id} label="Signaler cette boutique" />
        </section>
      )}
    </div>
  );
}
