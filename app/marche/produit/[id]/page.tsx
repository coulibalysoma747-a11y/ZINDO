import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, MessageCircle, Phone } from "lucide-react";
import { loadMarketProducts, loadPublishedShops } from "@/lib/market-data";
import { discountPercent, marketCategoryLabel } from "@/lib/market";
import { formatMoney } from "@/lib/format";
import { MarketProductGrid } from "@/components/market/MarketProductCard";
import { ShopChip } from "@/components/market/ShopChip";
import { AddToCart } from "@/components/market/AddToCart";

export const dynamic = "force-dynamic";

function waLink(number: string, text: string) {
  const digits = number.replace(/\D/g, "");
  // Numéro local burkinabè à 8 chiffres : on ajoute l'indicatif 226.
  const full = digits.length === 8 ? `226${digits}` : digits;
  return `https://wa.me/${full}?text=${encodeURIComponent(text)}`;
}

export default async function MarketProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const shops = await loadPublishedShops();
  const [product] = await loadMarketProducts({ shops, productId: id, limit: 1 });
  if (!product) notFound();

  const shop = shops.find((s) => s.slug === product.shop.slug)!;
  const similar = (await loadMarketProducts({ shops, category: product.category, limit: 11 })).filter((p) => p.productId !== product.productId).slice(0, 10);
  const discount = discountPercent(product.price, product.promoPrice);
  const inStock = product.available > 0;
  const contact = shop.whatsapp || shop.phone;

  return (
    <div className="space-y-8">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="relative aspect-square overflow-hidden rounded-3xl bg-white ring-1 ring-zinc-200">
          {product.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.photoUrl} alt={product.name} className="h-full w-full object-contain" />
          ) : (
            <div className="flex h-full items-center justify-center text-6xl text-zinc-300">📦</div>
          )}
          {discount != null && <span className="absolute left-3 top-3 rounded-full bg-red-600 px-3 py-1 text-sm font-bold text-white">-{discount} %</span>}
        </div>

        <div className="space-y-4">
          <div>
            <Link href={`/marche?categorie=${product.category}`} className="text-xs font-medium uppercase tracking-wide text-zindo-green-700">
              {marketCategoryLabel(product.category)}
            </Link>
            <h1 className="mt-1 text-2xl font-bold text-zinc-900">{product.name}</h1>
            {product.brand && <p className="text-sm text-zinc-500">Marque : {product.brand}</p>}
          </div>
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-3xl font-extrabold text-zindo-green-700">{formatMoney(product.promoPrice ?? product.price)}</span>
            {product.promoPrice != null && <span className="text-lg text-zinc-400 line-through">{formatMoney(product.price)}</span>}
          </div>
          <p className={inStock ? "text-sm font-semibold text-emerald-700" : "text-sm font-semibold text-red-600"}>
            {inStock ? `En stock : ${product.available} ${product.unit}` : "Rupture de stock"}
          </p>
          {product.description && <p className="whitespace-pre-line text-sm leading-relaxed text-zinc-700">{product.description}</p>}

          <AddToCart productId={product.productId} available={product.available} />

          {/* Contact direct du vendeur, ouvert sans compte pour l'instant (décision du 28/09). */}
          <div className="flex flex-col gap-2 sm:flex-row">
            {shop.whatsapp && (
              <a
                href={waLink(shop.whatsapp, `Bonjour, je suis intéressé(e) par « ${product.name} » vu sur le Marché ZINDO.`)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-zindo-green-600 font-semibold text-white hover:bg-zindo-green-700"
              >
                <MessageCircle className="h-5 w-5" /> Contacter sur WhatsApp
              </a>
            )}
            {shop.phone && (
              <a href={`tel:${shop.phone}`} className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-white font-semibold text-zinc-800 hover:bg-zinc-50">
                <Phone className="h-5 w-5" /> Appeler
              </a>
            )}
          </div>
          {!contact && <p className="text-sm text-zinc-500">Le vendeur n&apos;a pas encore indiqué de numéro.</p>}

          <div className="space-y-2 rounded-2xl bg-white p-3 ring-1 ring-zinc-200">
            <p className="text-xs font-medium text-zinc-500">Vendu par</p>
            <ShopChip shop={shop} />
            {shop.address && (
              <p className="flex items-center gap-1 text-xs text-zinc-500">
                <MapPin className="h-3.5 w-3.5" /> {shop.address}
              </p>
            )}
          </div>
        </div>
      </div>

      {similar.length > 0 && (
        <section>
          <h2 className="mb-3 text-base font-bold text-zinc-900">Produits similaires</h2>
          <MarketProductGrid products={similar} />
        </section>
      )}
    </div>
  );
}
