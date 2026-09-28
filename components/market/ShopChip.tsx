import Link from "next/link";
import { BadgeCheck, MapPin } from "lucide-react";
import type { MarketShopSummary } from "@/lib/market";
import { Stars } from "./Stars";

export function ShopLogo({ shop, size = 40 }: { shop: Pick<MarketShopSummary, "name" | "logoUrl">; size?: number }) {
  return shop.logoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={shop.logoUrl} alt="" style={{ width: size, height: size }} className="shrink-0 rounded-full bg-white object-cover ring-1 ring-zinc-200" />
  ) : (
    <span
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      className="flex shrink-0 items-center justify-center rounded-full bg-zindo-green-100 font-bold text-zindo-green-700 ring-1 ring-zindo-green-200"
    >
      {shop.name.charAt(0).toUpperCase()}
    </span>
  );
}

/** Petite carte boutique (logo, nom, note, ville, badge vérifié). */
export function ShopChip({ shop }: { shop: MarketShopSummary }) {
  return (
    <Link
      href={`/marche/boutique/${shop.slug}`}
      className="flex min-w-56 shrink-0 items-center gap-3 rounded-2xl bg-white p-3 ring-1 ring-zinc-200 transition hover:shadow-md"
    >
      <ShopLogo shop={shop} size={44} />
      <div className="min-w-0">
        <p className="flex items-center gap-1 truncate text-sm font-semibold text-zinc-900">
          <span className="truncate">{shop.name}</span>
          {shop.verified && <BadgeCheck className="h-4 w-4 shrink-0 text-sky-600" aria-label="Vendeur vérifié" />}
        </p>
        <Stars rating={shop.rating} count={shop.reviewCount} />
        {shop.city && (
          <p className="flex items-center gap-1 text-xs text-zinc-500">
            <MapPin className="h-3 w-3" /> {shop.city}
          </p>
        )}
      </div>
    </Link>
  );
}

/** Grande carte boutique avec couverture (accueil et liste des boutiques). */
export function ShopCard({ shop }: { shop: MarketShopSummary & { coverUrl: string | null; description: string | null } }) {
  return (
    <Link href={`/marche/boutique/${shop.slug}`} className="group overflow-hidden rounded-2xl bg-white ring-1 ring-zinc-200 transition hover:shadow-lg">
      <div className="relative h-24 bg-gradient-to-br from-zindo-green-600 to-zindo-green-900">
        {shop.coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shop.coverUrl} alt="" loading="lazy" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
        )}
        <span className="absolute -bottom-6 left-4 rounded-full bg-white p-1 shadow">
          <ShopLogo shop={shop} size={48} />
        </span>
      </div>
      <div className="space-y-1 px-4 pb-4 pt-8">
        <p className="flex items-center gap-1 font-semibold text-zinc-900">
          <span className="truncate">{shop.name}</span>
          {shop.verified && <BadgeCheck className="h-4 w-4 shrink-0 text-sky-600" aria-label="Vendeur vérifié" />}
        </p>
        <Stars rating={shop.rating} count={shop.reviewCount} />
        {shop.description && <p className="line-clamp-2 text-xs text-zinc-500">{shop.description}</p>}
        {shop.city && (
          <p className="flex items-center gap-1 text-xs text-zinc-500">
            <MapPin className="h-3 w-3" /> {shop.city}
          </p>
        )}
      </div>
    </Link>
  );
}
