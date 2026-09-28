import { PERMISSIONS } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { formatDateTime, formatMoney } from "@/lib/format";
import { requireMarketSeller } from "@/lib/market-seller";
import { MarketSellerNav } from "../MarketSellerNav";

/** Clients du Marché : ceux qui ont commandé à cette boutique. */
export default async function MyMarketCustomersPage() {
  const { user, shop, newOrders, unreadMessages } = await requireMarketSeller(PERMISSIONS.CUSTOMERS_MANAGE);
  const { data } = await supabase
    .from("market_orders")
    .select("buyerId:buyer_id, customerName:customer_name, customerPhone:customer_phone, status, total, createdAt:created_at, buyer:market_buyers(kind, companyName:company_name)")
    .eq("business_id", user.businessId)
    .order("created_at", { ascending: false })
    .limit(2000);
  const orders = (data ?? []) as unknown as {
    buyerId: string;
    customerName: string;
    customerPhone: string;
    status: string;
    total: number;
    createdAt: string;
    buyer: { kind: string; companyName: string | null } | null;
  }[];

  const customers = new Map<string, { name: string; phone: string; pro: string | null; orders: number; spent: number; last: string }>();
  for (const o of orders) {
    const c = customers.get(o.buyerId) ?? { name: o.customerName, phone: o.customerPhone, pro: o.buyer?.kind === "PRO" ? o.buyer.companyName : null, orders: 0, spent: 0, last: o.createdAt };
    if (o.status !== "ANNULEE") c.orders += 1;
    if (o.status === "LIVREE") c.spent += Number(o.total);
    customers.set(o.buyerId, c);
  }
  const list = [...customers.values()].sort((a, b) => b.spent - a.spent);
  const currency = user.business.currency;

  return (
    <div className="max-w-5xl space-y-5">
      <MarketSellerNav active="/mon-marche/clients" shop={shop} newOrders={newOrders} unreadMessages={unreadMessages} />
      <p className="text-sm text-zinc-500">
        {list.length} client{list.length > 1 ? "s" : ""} ont commandé sur votre boutique. Ils sont aussi ajoutés à vos Clients ZINDO à la livraison.
      </p>
      <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-zinc-200">
        {list.length === 0 ? (
          <p className="p-6 text-center text-sm text-zinc-500">Aucun client pour le moment.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-left text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-4 py-2">Client</th>
                <th className="px-4 py-2 text-right">Commandes</th>
                <th className="px-4 py-2 text-right">Total dépensé</th>
                <th className="hidden px-4 py-2 sm:table-cell">Dernière commande</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {list.map((c) => (
                <tr key={c.phone}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-zinc-900">{c.name}</p>
                    <a href={`tel:${c.phone}`} className="text-xs text-zindo-green-700">
                      {c.phone}
                    </a>
                    {c.pro && <p className="text-xs text-zinc-500">🏢 {c.pro}</p>}
                  </td>
                  <td className="px-4 py-3 text-right">{c.orders}</td>
                  <td className="px-4 py-3 text-right font-semibold">{formatMoney(c.spent, currency)}</td>
                  <td className="hidden px-4 py-3 text-zinc-500 sm:table-cell">{formatDateTime(c.last)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
