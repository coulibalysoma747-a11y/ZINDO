import { loadPublishedShops } from "@/lib/market-data";
import { ShopChip } from "@/components/market/ShopChip";

export const dynamic = "force-dynamic";

export default async function MarketShopsPage() {
  const shops = await loadPublishedShops();
  // Boutiques vérifiées en premier.
  const sorted = [...shops].sort((a, b) => Number(b.verified) - Number(a.verified));
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-zinc-900">Boutiques ({shops.length})</h1>
      {sorted.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((s) => (
            <ShopChip key={s.slug} shop={s} />
          ))}
        </div>
      ) : (
        <p className="rounded-2xl bg-white p-6 text-center text-sm text-zinc-500">Aucune boutique pour le moment.</p>
      )}
    </div>
  );
}
