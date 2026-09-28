import Link from "next/link";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getCurrentBuyer } from "@/lib/market-buyer";
import { formatDateTime } from "@/lib/format";
import { ShopLogo } from "@/components/market/ShopChip";

export const dynamic = "force-dynamic";

/** Messages de l'acheteur : une conversation par boutique. */
export default async function BuyerMessagesPage() {
  const buyer = await getCurrentBuyer();
  if (!buyer) redirect("/marche/compte?suite=/marche/messages");
  const { data } = await supabase
    .from("market_conversations")
    .select("id, lastMessageAt:last_message_at, preview:last_message_preview, unread:buyer_unread, shop:market_shops(name, logoUrl:logo_url)")
    .eq("buyer_id", buyer.id)
    .order("last_message_at", { ascending: false });
  const conversations = (data ?? []) as unknown as { id: string; lastMessageAt: string; preview: string | null; unread: number; shop: { name: string; logoUrl: string | null } }[];

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-xl font-bold text-zinc-900">Messages</h1>
      {conversations.length === 0 ? (
        <p className="rounded-2xl bg-white p-8 text-center text-sm text-zinc-500 ring-1 ring-zinc-200">
          Aucune conversation. Depuis un produit ou une boutique, touchez « Envoyer un message ».
        </p>
      ) : (
        <ul className="divide-y divide-zinc-100 overflow-hidden rounded-2xl bg-white ring-1 ring-zinc-200">
          {conversations.map((c) => (
            <li key={c.id}>
              <Link href={`/marche/messages/${c.id}`} className="flex items-center gap-3 p-4 hover:bg-zinc-50">
                <ShopLogo shop={c.shop} size={44} />
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-sm ${c.unread ? "font-bold text-zinc-900" : "font-semibold text-zinc-800"}`}>{c.shop.name}</p>
                  <p className={`truncate text-sm ${c.unread ? "text-zinc-800" : "text-zinc-500"}`}>{c.preview ?? "—"}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs text-zinc-400">{formatDateTime(c.lastMessageAt)}</p>
                  {c.unread > 0 && <span className="mt-1 inline-block rounded-full bg-zindo-green-600 px-2 py-0.5 text-xs font-bold text-white">{c.unread}</span>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
