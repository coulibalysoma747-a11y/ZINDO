import { notFound } from "next/navigation";
import { BadgeCheck, Clock, MapPin, MessageCircle, Phone } from "lucide-react";
import { loadMarketProducts, loadShopBySlug } from "@/lib/market-data";
import { MarketProductGrid } from "@/components/market/MarketProductCard";
import { ShopLogo } from "@/components/market/ShopChip";

export const dynamic = "force-dynamic";

/** Page publique d'une boutique du Marché. */
export default async function MarketShopPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ q?: string }> }) {
  const { slug } = await params;
  const { q = "" } = await searchParams;
  const shop = await loadShopBySlug(slug);
  if (!shop) notFound();
  const products = await loadMarketProducts({ shops: [shop], q, limit: 200 });
  const whatsappDigits = shop.whatsapp?.replace(/\D/g, "") ?? "";

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-3xl bg-white ring-1 ring-zinc-200">
        <div className="h-28 bg-gradient-to-br from-zindo-green-500 to-zindo-green-800 sm:h-44">
          {shop.coverUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shop.coverUrl} alt="" className="h-full w-full object-cover" />
          )}
        </div>
        <div className="space-y-3 p-4 sm:p-6">
          <div className="-mt-12 flex items-end gap-3 sm:-mt-16">
            <div className="rounded-full bg-white p-1">
              <ShopLogo shop={shop} size={72} />
            </div>
          </div>
          <div>
            <h1 className="flex items-center gap-1.5 text-xl font-bold text-zinc-900">
              {shop.name}
              {shop.verified && <BadgeCheck className="h-5 w-5 text-sky-600" aria-label="Vendeur vérifié" />}
            </h1>
            {shop.verified && <p className="text-xs font-medium text-sky-700">Vendeur vérifié par ZINDO</p>}
          </div>
          {shop.description && <p className="whitespace-pre-line text-sm text-zinc-700">{shop.description}</p>}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-600">
            {(shop.city || shop.address) && (
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" /> {[shop.address, shop.city].filter(Boolean).join(", ")}
              </span>
            )}
            {shop.hours && (
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" /> {shop.hours}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {whatsappDigits && (
              <a
                href={`https://wa.me/${whatsappDigits.length === 8 ? `226${whatsappDigits}` : whatsappDigits}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-zindo-green-600 px-4 text-sm font-semibold text-white hover:bg-zindo-green-700"
              >
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </a>
            )}
            {shop.phone && (
              <a href={`tel:${shop.phone}`} className="inline-flex h-10 items-center gap-2 rounded-xl border border-zinc-300 px-4 text-sm font-semibold text-zinc-800 hover:bg-zinc-50">
                <Phone className="h-4 w-4" /> Appeler
              </a>
            )}
          </div>
        </div>
      </div>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-bold text-zinc-900">Produits ({products.length})</h2>
          <form className="flex gap-2">
            <input name="q" defaultValue={q} placeholder="Chercher dans la boutique…" className="h-9 w-56 rounded-lg border border-zinc-300 bg-white px-3 text-sm" />
          </form>
        </div>
        {products.length > 0 ? (
          <MarketProductGrid products={products} />
        ) : (
          <p className="rounded-2xl bg-white p-6 text-center text-sm text-zinc-500">Aucun produit publié.</p>
        )}
      </section>
    </div>
  );
}
