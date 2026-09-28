import Link from "next/link";
import { requireMarketSeller } from "@/lib/market-seller";
import { MarketSellerNav } from "../MarketSellerNav";
import { PERMISSIONS } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { marketOrderStatusLabel } from "@/lib/market";
import { formatMoney, formatDateTime } from "@/lib/format";
import { OrderStatusBadge } from "@/components/market/OrderStatusBadge";

const FILTERS = [
  { key: "", label: "Toutes" },
  { key: "RECUE", label: "🟠 Nouvelles" },
  { key: "CONFIRMEE", label: "Confirmées" },
  { key: "PREPARATION", label: "🔵 En préparation" },
  { key: "PRETE", label: "🟣 Prêtes" },
  { key: "EN_LIVRAISON", label: "🚚 En livraison" },
  { key: "LIVREE", label: "🟢 Livrées" },
  { key: "ANNULEE", label: "🔴 Annulées" },
];

/** Commandes reçues sur le Marché (flag nouveau_marche). */
export default async function MarketOrdersPage({ searchParams }: { searchParams: Promise<{ statut?: string }> }) {
  const { user, shop, newOrders, unreadMessages } = await requireMarketSeller(PERMISSIONS.SALES_CREATE);
  const { statut = "" } = await searchParams;

  let query = supabase
    .from("market_orders")
    .select("id, number, status, customerName:customer_name, customerPhone:customer_phone, total, deliveryMode:delivery_mode, createdAt:created_at, items:market_order_items(name, quantity)")
    .eq("business_id", user.businessId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (FILTERS.some((f) => f.key && f.key === statut)) query = query.eq("status", statut);
  const { data } = await query;
  const orders = (data ?? []) as unknown as {
    id: string;
    number: string;
    status: string;
    customerName: string;
    customerPhone: string;
    total: number;
    deliveryMode: string;
    createdAt: string;
    items: { name: string; quantity: number }[];
  }[];
  const currency = user.business.currency;

  return (
    <div className="max-w-5xl space-y-4">
      <MarketSellerNav active="/mon-marche/commandes" shop={shop} newOrders={newOrders} unreadMessages={unreadMessages} />
      <div className="flex gap-2 overflow-x-auto pb-1 text-sm">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key ? `/mon-marche/commandes?statut=${f.key}` : "/mon-marche/commandes"}
            className={statut === f.key ? "shrink-0 rounded-full bg-zindo-green-600 px-3 py-1.5 font-semibold text-white" : "shrink-0 rounded-full bg-white px-3 py-1.5 text-zinc-700 ring-1 ring-zinc-200"}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {orders.length === 0 ? (
        <p className="rounded-2xl bg-white p-6 text-center text-sm text-zinc-500 ring-1 ring-zinc-200">Aucune commande.</p>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-zinc-200">
          <table className="hidden w-full text-sm md:table">
            <thead className="bg-zinc-50 text-left text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-4 py-2">Commande</th>
                <th className="px-4 py-2">Client</th>
                <th className="px-4 py-2">Produits</th>
                <th className="px-4 py-2 text-right">Montant</th>
                <th className="px-4 py-2">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3">
                    <Link href={`/mon-marche/commandes/${o.id}`} className="font-semibold text-zindo-green-700 hover:underline">
                      {o.number}
                    </Link>
                    <p className="text-xs text-zinc-500">{formatDateTime(o.createdAt)}</p>
                  </td>
                  <td className="px-4 py-3">
                    {o.customerName}
                    <p className="text-xs text-zinc-500">{o.customerPhone}</p>
                  </td>
                  <td className="max-w-xs truncate px-4 py-3 text-zinc-600">{o.items.map((i) => `${i.name} ×${i.quantity}`).join(", ")}</td>
                  <td className="px-4 py-3 text-right font-semibold">{formatMoney(o.total, currency)}</td>
                  <td className="px-4 py-3">
                    <OrderStatusBadge status={o.status} label={marketOrderStatusLabel(o.status)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="divide-y divide-zinc-100 md:hidden">
            {orders.map((o) => (
              <Link key={o.id} href={`/mon-marche/commandes/${o.id}`} className="block p-4">
                <div className="flex justify-between">
                  <span className="font-semibold text-zinc-900">{o.number}</span>
                  <span className="font-semibold">{formatMoney(o.total, currency)}</span>
                </div>
                <p className="text-xs text-zinc-500">
                  {formatDateTime(o.createdAt)} · {o.customerName}
                </p>
                <OrderStatusBadge status={o.status} label={marketOrderStatusLabel(o.status)} />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
