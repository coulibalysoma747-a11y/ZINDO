import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getCurrentBuyer } from "@/lib/market-buyer";
import { loadConversation, loadThread, markConversationRead } from "@/lib/market-messages";
import { ChatThread } from "@/components/market/ChatThread";
import { ShopLogo } from "@/components/market/ShopChip";

export const dynamic = "force-dynamic";

export default async function BuyerConversationPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ produit?: string; commande?: string }> }) {
  const { id } = await params;
  const { produit, commande } = await searchParams;
  const buyer = await getCurrentBuyer();
  if (!buyer) redirect(`/marche/compte?suite=${encodeURIComponent(`/marche/messages/${id}`)}`);
  const conversation = await loadConversation(id);
  if (!conversation || conversation.buyerId !== buyer.id) notFound();

  const [messages] = await Promise.all([loadThread(id), markConversationRead(id, "BUYER")]);

  // Pièce jointe proposée au premier envoi (depuis « Envoyer un message » d'un produit ou d'une commande).
  let attachment: { listingId?: string; orderId?: string; label: string } | null = null;
  if (produit) {
    const { data } = await supabase.from("market_listings").select("id, product:products(name)").eq("id", produit).eq("business_id", conversation.businessId).maybeSingle();
    if (data) attachment = { listingId: data.id as string, label: (data.product as unknown as { name: string } | null)?.name ?? "Produit" };
  } else if (commande) {
    const { data } = await supabase.from("market_orders").select("id, number").eq("id", commande).eq("buyer_id", buyer.id).maybeSingle();
    if (data) attachment = { orderId: data.id as string, label: `Commande ${data.number}` };
  }

  return (
    <div className="mx-auto max-w-2xl space-y-3">
      <div className="flex items-center gap-3">
        <Link href="/marche/messages" aria-label="Retour aux messages" className="rounded-full p-1.5 hover:bg-zinc-100">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <Link href={`/marche/boutique/${conversation.shop.slug}`} className="flex items-center gap-2">
          <ShopLogo shop={conversation.shop} size={36} />
          <span className="font-semibold text-zinc-900">{conversation.shop.name}</span>
        </Link>
      </div>
      <ChatThread conversationId={id} me="BUYER" messages={messages} attachment={attachment} orderHrefPrefix="/marche/commandes/" />
    </div>
  );
}
