import { loadPublishedShops } from "@/lib/market-data";
import { ShopCard } from "@/components/market/ShopChip";

export const dynamic = "force-dynamic";

export default async function MarketShopsPage() {
  const shops = await loadPublishedShops();
  // Boutiques vérifiées d'abord, puis les mieux notées.
  const sorted = [...shops].sort((a, b) => Number(b.verified) - Number(a.verified) || (b.rating ?? 0) - (a.rating ?? 0));
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Boutiques</h1>
        <p className="text-sm text-zinc-500">{shops.length} boutique{shops.length > 1 ? "s" : ""} sur le Marché ZINDO</p>
      </div>
      {sorted.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {sorted.map((s) => (
            <ShopCard key={s.slug} shop={s} />
          ))}
        </div>
      ) : (
        <p className="rounded-2xl bg-white p-8 text-center text-sm text-zinc-500 ring-1 ring-zinc-200">Aucune boutique pour le moment.</p>
      )}
    </div>
  );
}
