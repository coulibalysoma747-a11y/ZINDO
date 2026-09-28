import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, ChevronRight, Eye, Package, ShoppingBag, Star, Users, Wallet } from "lucide-react";
import { PERMISSIONS } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { formatDateTime, formatMoney } from "@/lib/format";
import { marketOrderStatusLabel } from "@/lib/market";
import { requireMarketSeller } from "@/lib/market-seller";
import { OrderStatusBadge } from "@/components/market/OrderStatusBadge";
import { MarketSellerNav } from "./MarketSellerNav";
import { SalesBarChart } from "./SalesBarChart";

const PERIODS = [
  { key: "jour", label: "Aujourd'hui" },
  { key: "7j", label: "7 jours" },
  { key: "30j", label: "30 jours" },
  { key: "annee", label: "12 mois" },
] as const;

type OrderRow = {
  id: string;
  number: string;
  status: string;
  total: number;
  customerName: string;
  buyerId: string;
  createdAt: string;
  items: { productId: string; name: string; quantity: number; unitPrice: number }[];
};

function startOfDay(d: Date) {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/** Tableau de bord du vendeur sur le Marché (flag nouveau_marche). */
export default async function MyMarketDashboardPage({ searchParams }: { searchParams: Promise<{ periode?: string }> }) {
  const { user, shop, newOrders, unreadMessages } = await requireMarketSeller(PERMISSIONS.PRODUCTS_MANAGE);
  if (!shop) redirect("/mon-marche/boutique");
  const { periode = "7j" } = await searchParams;
  const period = PERIODS.some((p) => p.key === periode) ? periode : "7j";

  const today = startOfDay(new Date());
  const since = new Date(today);
  if (period === "7j") since.setDate(since.getDate() - 6);
  if (period === "30j") since.setDate(since.getDate() - 29);
  if (period === "annee") since.setMonth(since.getMonth() - 11, 1);
  // Graphique : 7 derniers jours pour « aujourd'hui » et « 7 jours ».
  const chartSince = new Date(today);
  if (period === "jour" || period === "7j") chartSince.setDate(chartSince.getDate() - 6);
  else if (period === "30j") chartSince.setDate(chartSince.getDate() - 29);
  else chartSince.setMonth(chartSince.getMonth() - 11, 1);
  const from = new Date(Math.min(since.getTime(), chartSince.getTime())).toISOString();

  const [{ data: orderData }, { data: viewData }, { data: listingData }, { data: reviewData }] = await Promise.all([
    supabase
      .from("market_orders")
      .select("id, number, status, total, customerName:customer_name, buyerId:buyer_id, createdAt:created_at, items:market_order_items(productId:product_id, name, quantity, unitPrice:unit_price)")
      .eq("business_id", user.businessId)
      .gte("created_at", from)
      .order("created_at", { ascending: false }),
    supabase.from("market_daily_views").select("day, productViews:product_views, shopViews:shop_views").eq("business_id", user.businessId).gte("day", since.toISOString().slice(0, 10)),
    supabase.from("market_listings").select("productId:product_id").eq("business_id", user.businessId).eq("published", true).eq("removed_by_admin", false),
    supabase.from("market_reviews").select("rating").eq("shop_id", shop.id).eq("hidden", false),
  ]);
  const allOrders = (orderData ?? []) as unknown as OrderRow[];
  const orders = allOrders.filter((o) => new Date(o.createdAt) >= since);
  const delivered = orders.filter((o) => o.status === "LIVREE");
  const active = orders.filter((o) => o.status !== "ANNULEE");
  const revenue = delivered.reduce((sum, o) => sum + Number(o.total), 0);
  const visits = ((viewData ?? []) as { productViews: number; shopViews: number }[]).reduce((sum, v) => sum + v.productViews + v.shopViews, 0);
  const customers = new Set(active.map((o) => o.buyerId)).size;
  const ratings = (reviewData ?? []).map((r) => r.rating as number);
  const avgRating = ratings.length ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 : null;

  // Produits publiés en rupture au point de vente de la boutique.
  const publishedIds = (listingData ?? []).map((l) => l.productId as string);
  const { data: stockData } = publishedIds.length
    ? await supabase.from("product_stocks").select("productId:product_id, locationId:location_id, quantity").in("product_id", publishedIds)
    : { data: [] };
  const stockBy = new Map<string, number>();
  for (const s of (stockData ?? []) as { productId: string; locationId: string; quantity: number }[]) {
    if (shop.locationId && s.locationId !== shop.locationId) continue;
    stockBy.set(s.productId, (stockBy.get(s.productId) ?? 0) + Number(s.quantity));
  }
  const outOfStock = publishedIds.filter((id) => (stockBy.get(id) ?? 0) <= 0).length;

  // Série du graphique (ventes livrées, par jour ou par mois).
  const monthly = period === "annee";
  const buckets: { key: string; label: string; value: number }[] = [];
  const cursor = new Date(chartSince);
  while (cursor <= today) {
    buckets.push({
      key: monthly ? cursor.toISOString().slice(0, 7) : cursor.toISOString().slice(0, 10),
      // 30 barres : date courte (22/09) ; 7 barres : jour de la semaine (lun. 22).
      label: monthly
        ? cursor.toLocaleDateString("fr-FR", { month: "short" })
        : period === "30j"
          ? cursor.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })
          : cursor.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" }),
      value: 0,
    });
    if (monthly) cursor.setMonth(cursor.getMonth() + 1);
    else cursor.setDate(cursor.getDate() + 1);
  }
  for (const o of allOrders.filter((x) => x.status === "LIVREE")) {
    const key = monthly ? o.createdAt.slice(0, 7) : new Date(o.createdAt).toISOString().slice(0, 10);
    const bucket = buckets.find((b) => b.key === key);
    if (bucket) bucket.value += Number(o.total);
  }

  // Produits les plus vendus sur la période (commandes non annulées).
  const top = new Map<string, { name: string; quantity: number; amount: number }>();
  for (const o of active) {
    for (const i of o.items) {
      const current = top.get(i.productId) ?? { name: i.name, quantity: 0, amount: 0 };
      top.set(i.productId, { name: i.name, quantity: current.quantity + Number(i.quantity), amount: current.amount + Number(i.quantity) * Number(i.unitPrice) });
    }
  }
  const topProducts = [...top.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 5);
  const currency = user.business.currency;

  const tiles = [
    { icon: Wallet, label: "Ventes livrées", value: formatMoney(revenue, currency), hint: `${delivered.length} commande${delivered.length > 1 ? "s" : ""} livrée${delivered.length > 1 ? "s" : ""}` },
    { icon: ShoppingBag, label: "Commandes", value: String(active.length), hint: newOrders > 0 ? `${newOrders} à confirmer` : "Aucune en attente" },
    { icon: Eye, label: "Visites", value: String(visits), hint: "Produits et boutique" },
    { icon: Users, label: "Clients", value: String(customers), hint: "Acheteurs distincts" },
    { icon: Package, label: "Produits publiés", value: String(publishedIds.length), hint: outOfStock > 0 ? `${outOfStock} en rupture` : "Tous en stock" },
    { icon: Star, label: "Note moyenne", value: avgRating != null ? `${avgRating.toLocaleString("fr-FR")} / 5` : "—", hint: `${ratings.length} avis` },
  ];

  return (
    <div className="max-w-6xl space-y-6">
      <MarketSellerNav active="/mon-marche" shop={shop} newOrders={newOrders} unreadMessages={unreadMessages} />

      {newOrders > 0 && (
        <Link href="/mon-marche/commandes?statut=RECUE" className="flex items-center gap-3 rounded-2xl bg-orange-50 p-4 ring-1 ring-orange-200 hover:bg-orange-100">
          <AlertTriangle className="h-5 w-5 text-orange-600" />
          <span className="flex-1 text-sm font-semibold text-orange-900">
            {newOrders} nouvelle{newOrders > 1 ? "s" : ""} commande{newOrders > 1 ? "s" : ""} à confirmer
          </span>
          <ChevronRight className="h-5 w-5 text-orange-600" />
        </Link>
      )}

      <div className="flex gap-1.5 overflow-x-auto text-sm">
        {PERIODS.map((p) => (
          <Link
            key={p.key}
            href={`/mon-marche?periode=${p.key}`}
            className={period === p.key ? "shrink-0 rounded-full bg-zinc-900 px-3 py-1.5 font-semibold text-white" : "shrink-0 rounded-full bg-white px-3 py-1.5 text-zinc-700 ring-1 ring-zinc-200"}
          >
            {p.label}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        {tiles.map(({ icon: Icon, label, value, hint }) => (
          <div key={label} className="rounded-2xl bg-white p-4 ring-1 ring-zinc-200">
            <p className="flex items-center gap-1.5 text-xs font-medium text-zinc-500">
              <Icon className="h-4 w-4" /> {label}
            </p>
            <p className="mt-1 text-xl font-extrabold text-zinc-900">{value}</p>
            <p className="text-xs text-zinc-500">{hint}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <section className="rounded-2xl bg-white p-5 ring-1 ring-zinc-200">
          <h2 className="mb-4 font-semibold text-zinc-900">Ventes livrées {monthly ? "par mois" : "par jour"}</h2>
          <SalesBarChart points={buckets.map(({ label, value }) => ({ label, value }))} currency={currency} />
        </section>
        <section className="rounded-2xl bg-white p-5 ring-1 ring-zinc-200">
          <h2 className="mb-3 font-semibold text-zinc-900">Produits les plus vendus</h2>
          {topProducts.length === 0 ? (
            <p className="text-sm text-zinc-500">Pas encore de ventes sur la période.</p>
          ) : (
            <ol className="space-y-3">
              {topProducts.map((p, i) => (
                <li key={p.name} className="flex items-center gap-3 text-sm">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-bold text-zinc-600">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-zinc-800">{p.name}</span>
                  <span className="shrink-0 text-zinc-500">{p.quantity} vendu{p.quantity > 1 ? "s" : ""}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <section className="overflow-hidden rounded-2xl bg-white ring-1 ring-zinc-200">
        <div className="flex items-center justify-between p-5 pb-3">
          <h2 className="font-semibold text-zinc-900">Commandes récentes</h2>
          <Link href="/mon-marche/commandes" className="inline-flex items-center text-sm font-semibold text-zindo-green-700 hover:underline">
            Toutes les commandes <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        {allOrders.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-zinc-500">Aucune commande pour le moment. Publiez vos produits pour recevoir vos premières commandes.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-left text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-5 py-2">Commande</th>
                <th className="hidden px-5 py-2 sm:table-cell">Client</th>
                <th className="hidden px-5 py-2 md:table-cell">Produits</th>
                <th className="px-5 py-2 text-right">Montant</th>
                <th className="px-5 py-2">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {allOrders.slice(0, 6).map((o) => (
                <tr key={o.id} className="hover:bg-zinc-50">
                  <td className="px-5 py-3">
                    <Link href={`/mon-marche/commandes/${o.id}`} className="font-semibold text-zindo-green-700 hover:underline">
                      {o.number}
                    </Link>
                    <p className="text-xs text-zinc-500">{formatDateTime(o.createdAt)}</p>
                  </td>
                  <td className="hidden px-5 py-3 sm:table-cell">{o.customerName}</td>
                  <td className="hidden max-w-xs truncate px-5 py-3 text-zinc-600 md:table-cell">{o.items.map((i) => `${i.name} ×${i.quantity}`).join(", ")}</td>
                  <td className="px-5 py-3 text-right font-semibold">{formatMoney(o.total, currency)}</td>
                  <td className="px-5 py-3">
                    <OrderStatusBadge status={o.status} label={marketOrderStatusLabel(o.status)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
