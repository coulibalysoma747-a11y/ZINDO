import Link from "next/link";
import { BadgeCheck, Flame, MapPin } from "lucide-react";
import { formatMoney } from "@/lib/format";
import { discountPercent, type MarketProduct } from "@/lib/market";
import { FavoriteButton } from "./FavoriteButton";
import { QuickAddButton } from "./QuickAddButton";
import { Stars } from "./Stars";

/** Carte produit du Marché : photo, remise, favori, note, prix, boutique et ajout rapide. */
export function MarketProductCard({ product, favorite = false }: { product: MarketProduct; favorite?: boolean }) {
  const discount = discountPercent(product.price, product.promoPrice);
  const outOfStock = product.available <= 0;
  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-zinc-200 transition hover:-translate-y-0.5 hover:shadow-lg hover:ring-zinc-300">
      {/* Lien étiré sur toute la carte ; les boutons (favori, ajout) passent au-dessus. */}
      <Link href={`/marche/produit/${product.productId}`} aria-label={product.name} className="absolute inset-0 z-[1] rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-zindo-green-600" />
      <div className="relative aspect-square overflow-hidden bg-zinc-50">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={product.photoUrl ?? ""} alt={product.name} loading="lazy" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
        {discount != null && <span className="absolute left-2 top-2 rounded-lg bg-red-600 px-2 py-0.5 text-xs font-bold text-white shadow">-{discount} %</span>}
        <span className="absolute right-2 top-2 z-10">
          <FavoriteButton listingId={product.listingId} initial={favorite} />
        </span>
        {product.boosted && (
          <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-lg bg-orange-500 px-2 py-0.5 text-[11px] font-bold text-white shadow">
            <Flame className="h-3 w-3" /> Mis en avant
          </span>
        )}
        {outOfStock && <span className="absolute inset-x-0 bottom-0 bg-zinc-900/70 py-1.5 text-center text-xs font-semibold text-white">Rupture de stock</span>}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="line-clamp-2 min-h-[2.5rem] text-sm font-medium leading-tight text-zinc-900">{product.name}</p>
        <Stars rating={product.rating} count={product.reviewCount} />
        <div className="mt-auto flex items-end justify-between gap-2 pt-1">
          <div className="min-w-0">
            <p className="text-base font-extrabold text-zinc-900">{formatMoney(product.promoPrice ?? product.price, product.currency)}</p>
            {product.promoPrice != null && <p className="text-xs text-zinc-400 line-through">{formatMoney(product.price, product.currency)}</p>}
          </div>
          <span className="relative z-10">
            <QuickAddButton productId={product.productId} disabled={outOfStock} />
          </span>
        </div>
        <div className="flex items-center gap-1 border-t border-zinc-100 pt-2 text-xs text-zinc-500">
          <span className="truncate">{product.shop.name}</span>
          {product.shop.verified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-sky-600" aria-label="Vendeur vérifié" />}
          {product.shop.city && (
            <span className="ml-auto flex shrink-0 items-center gap-0.5 text-zinc-400">
              <MapPin className="h-3 w-3" /> {product.shop.city}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function MarketProductGrid({ products, favorites }: { products: MarketProduct[]; favorites?: Set<string> }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
      {products.map((p) => (
        <MarketProductCard key={p.listingId} product={p} favorite={favorites?.has(p.listingId)} />
      ))}
    </div>
  );
}

/** Rangée défilante (téléphone) qui devient une grille sur grand écran. */
export function MarketProductRow({ products, favorites }: { products: MarketProduct[]; favorites?: Set<string> }) {
  return (
    <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:px-0 lg:grid-cols-4 xl:grid-cols-5">
      {products.map((p) => (
        <div key={p.listingId} className="w-40 shrink-0 snap-start sm:w-auto">
          <MarketProductCard product={p} favorite={favorites?.has(p.listingId)} />
        </div>
      ))}
    </div>
  );
}
