import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Phone } from "lucide-react";
import { PERMISSIONS } from "@/lib/permissions";
import { requireMarketSeller } from "@/lib/market-seller";
import { loadConversation, loadThread, markConversationRead } from "@/lib/market-messages";
import { ChatThread } from "@/components/market/ChatThread";

/** Conversation avec un client du Marché, côté vendeur. */
export default async function SellerConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user } = await requireMarketSeller(PERMISSIONS.SALES_CREATE);
  const conversation = await loadConversation(id);
  if (!conversation || conversation.businessId !== user.businessId) notFound();
  const [messages] = await Promise.all([loadThread(id), markConversationRead(id, "SELLER")]);

  return (
    <div className="max-w-3xl space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/mon-marche/messages" aria-label="Retour aux messages" className="rounded-full p-1.5 hover:bg-zinc-100">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <span className="font-semibold text-zinc-900">{conversation.buyer.name}</span>
        <a href={`tel:${conversation.buyer.phone}`} className="inline-flex items-center gap-1 text-sm text-zindo-green-700">
          <Phone className="h-4 w-4" /> {conversation.buyer.phone}
        </a>
      </div>
      <ChatThread conversationId={id} me="SELLER" messages={messages} />
    </div>
  );
}
