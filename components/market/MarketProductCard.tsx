import Link from "next/link";
import { BadgeCheck, MapPin } from "lucide-react";
import { formatMoney } from "@/lib/format";
import { discountPercent, type MarketProduct } from "@/lib/market";

/** Carte produit du Marché (grille compacte sur téléphone, plus large sur ordinateur). */
export function MarketProductCard({ product }: { product: MarketProduct }) {
  const discount = discountPercent(product.price, product.promoPrice);
  const outOfStock = product.available <= 0;
  return (
    <Link
      href={`/marche/produit/${product.productId}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white transition hover:shadow-md"
    >
      <div className="relative aspect-square bg-zinc-100">
        {product.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.photoUrl} alt={product.name} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-3xl text-zinc-300">📦</div>
        )}
        {discount != null && (
          <span className="absolute left-2 top-2 rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white">-{discount} %</span>
        )}
        {outOfStock && (
          <span className="absolute inset-x-0 bottom-0 bg-black/60 py-1 text-center text-xs font-semibold text-white">Rupture de stock</span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-2.5 sm:p-3">
        <p className="line-clamp-2 text-sm font-medium text-zinc-900">{product.name}</p>
        <div className="flex flex-wrap items-baseline gap-x-1.5">
          <span className="text-base font-bold text-zindo-green-700">{formatMoney(product.promoPrice ?? product.price)}</span>
          {product.promoPrice != null && <span className="text-xs text-zinc-400 line-through">{formatMoney(product.price)}</span>}
        </div>
        <p className="mt-auto flex items-center gap-1 truncate text-xs text-zinc-500">
          {product.shop.verified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-sky-600" aria-label="Vendeur vérifié" />}
          <span className="truncate">{product.shop.name}</span>
        </p>
        {product.shop.city && (
          <p className="flex items-center gap-1 truncate text-xs text-zinc-400">
            <MapPin className="h-3 w-3 shrink-0" /> {product.shop.city}
          </p>
        )}
      </div>
    </Link>
  );
}

export function MarketProductGrid({ products }: { products: MarketProduct[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {products.map((p) => (
        <MarketProductCard key={p.listingId} product={p} />
      ))}
    </div>
  );
}
