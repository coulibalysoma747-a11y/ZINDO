import Link from "next/link";
import { BadgeCheck, MapPin } from "lucide-react";
import type { MarketShopSummary } from "@/lib/market";

export function ShopLogo({ shop, size = 40 }: { shop: Pick<MarketShopSummary, "name" | "logoUrl">; size?: number }) {
  return shop.logoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={shop.logoUrl} alt="" style={{ width: size, height: size }} className="shrink-0 rounded-full object-cover ring-1 ring-zinc-200" />
  ) : (
    <span
      style={{ width: size, height: size }}
      className="flex shrink-0 items-center justify-center rounded-full bg-zindo-green-100 font-bold text-zindo-green-700"
    >
      {shop.name.charAt(0).toUpperCase()}
    </span>
  );
}

/** Petite carte boutique (logo, nom, ville, badge vérifié). */
export function ShopChip({ shop }: { shop: MarketShopSummary }) {
  return (
    <Link
      href={`/marche/boutique/${shop.slug}`}
      className="flex min-w-52 shrink-0 items-center gap-2.5 rounded-2xl border border-zinc-200 bg-white p-2.5 hover:shadow-sm"
    >
      <ShopLogo shop={shop} />
      <div className="min-w-0">
        <p className="flex items-center gap-1 truncate text-sm font-semibold text-zinc-900">
          <span className="truncate">{shop.name}</span>
          {shop.verified && <BadgeCheck className="h-4 w-4 shrink-0 text-sky-600" aria-label="Vendeur vérifié" />}
        </p>
        {shop.city && (
          <p className="flex items-center gap-1 text-xs text-zinc-500">
            <MapPin className="h-3 w-3" /> {shop.city}
          </p>
        )}
      </div>
    </Link>
  );
}
