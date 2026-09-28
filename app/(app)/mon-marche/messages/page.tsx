import Link from "next/link";
import { PERMISSIONS } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { formatDateTime } from "@/lib/format";
import { requireMarketSeller } from "@/lib/market-seller";
import { MarketSellerNav } from "../MarketSellerNav";

/** Messages des clients du Marché (le vendeur répond depuis ZINDO). */
export default async function SellerMessagesPage() {
  const { user, shop, newOrders, unreadMessages } = await requireMarketSeller(PERMISSIONS.SALES_CREATE);
  const { data } = await supabase
    .from("market_conversations")
    .select("id, lastMessageAt:last_message_at, preview:last_message_preview, unread:seller_unread, buyer:market_buyers(name, phone)")
    .eq("business_id", user.businessId)
    .order("last_message_at", { ascending: false })
    .limit(200);
  const conversations = (data ?? []) as unknown as { id: string; lastMessageAt: string; preview: string | null; unread: number; buyer: { name: string; phone: string } }[];

  return (
    <div className="max-w-5xl space-y-5">
      <MarketSellerNav active="/mon-marche/messages" shop={shop} newOrders={newOrders} unreadMessages={unreadMessages} />
      {conversations.length === 0 ? (
        <p className="rounded-2xl bg-white p-8 text-center text-sm text-zinc-500 ring-1 ring-zinc-200">Aucun message pour le moment. Les clients peuvent vous écrire depuis vos produits et votre boutique.</p>
      ) : (
        <ul className="divide-y divide-zinc-100 overflow-hidden rounded-2xl bg-white ring-1 ring-zinc-200">
          {conversations.map((c) => (
            <li key={c.id}>
              <Link href={`/mon-marche/messages/${c.id}`} className="flex items-center gap-3 p-4 hover:bg-zinc-50">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-zinc-100 font-bold text-zinc-600">{c.buyer.name.charAt(0).toUpperCase()}</span>
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-sm ${c.unread ? "font-bold text-zinc-900" : "font-semibold text-zinc-800"}`}>
                    {c.buyer.name} <span className="font-normal text-zinc-400">· {c.buyer.phone}</span>
                  </p>
                  <p className={`truncate text-sm ${c.unread ? "text-zinc-800" : "text-zinc-500"}`}>{c.preview ?? "—"}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs text-zinc-400">{formatDateTime(c.lastMessageAt)}</p>
                  {c.unread > 0 && <span className="mt-1 inline-block rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white">{c.unread}</span>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
