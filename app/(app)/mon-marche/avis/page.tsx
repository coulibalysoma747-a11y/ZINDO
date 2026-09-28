import { PERMISSIONS } from "@/lib/permissions";
import { loadReviews } from "@/lib/market-data";
import { formatDateTime } from "@/lib/format";
import { requireMarketSeller } from "@/lib/market-seller";
import { StarRow } from "@/components/market/Stars";
import { MarketSellerNav } from "../MarketSellerNav";

/** Avis laissés par les clients sur la boutique et ses produits. */
export default async function MyMarketReviewsPage() {
  const { shop, newOrders, unreadMessages } = await requireMarketSeller(PERMISSIONS.PRODUCTS_MANAGE);
  const reviews = shop ? await loadReviews({ shopId: shop.id }, 200) : [];
  const average = reviews.length ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10 : null;
  const distribution = [5, 4, 3, 2, 1].map((n) => ({ n, count: reviews.filter((r) => r.rating === n).length }));

  return (
    <div className="max-w-5xl space-y-5">
      <MarketSellerNav active="/mon-marche/avis" shop={shop} newOrders={newOrders} unreadMessages={unreadMessages} />
      <div className="grid gap-4 md:grid-cols-[260px_1fr]">
        <div className="h-fit space-y-3 rounded-2xl bg-white p-5 ring-1 ring-zinc-200">
          <p className="text-4xl font-extrabold text-zinc-900">{average != null ? average.toLocaleString("fr-FR") : "—"}</p>
          <p className="text-sm text-zinc-500">
            sur 5 · {reviews.length} avis
          </p>
          <ul className="space-y-1.5">
            {distribution.map((d) => (
              <li key={d.n} className="flex items-center gap-2 text-xs text-zinc-600">
                <span className="w-3">{d.n}</span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-100">
                  <span className="block h-full rounded-full bg-amber-400" style={{ width: reviews.length ? `${(d.count / reviews.length) * 100}%` : 0 }} />
                </span>
                <span className="w-6 text-right">{d.count}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl bg-white p-5 ring-1 ring-zinc-200">
          {reviews.length === 0 ? (
            <p className="text-sm text-zinc-500">Pas encore d&apos;avis. Vos clients peuvent vous noter après chaque livraison.</p>
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
        </div>
      </div>
    </div>
  );
}
