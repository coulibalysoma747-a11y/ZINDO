import "server-only";
import { supabase } from "@/lib/supabase";

/** Lectures de la messagerie du Marché (conversations acheteur ↔ boutique). */

export type ThreadMessage = {
  id: string;
  sender: "BUYER" | "SELLER";
  body: string | null;
  photoUrl: string | null;
  createdAt: string;
  listing: { productId: string; name: string; photoUrl: string | null; price: number; currency: string } | null;
  order: { number: string; total: number; status: string; currency: string } | null;
};

export type ConversationHeader = {
  id: string;
  buyerId: string;
  businessId: string;
  shop: { id: string; name: string; slug: string; logoUrl: string | null };
  buyer: { name: string; phone: string };
};

export async function loadConversation(conversationId: string): Promise<ConversationHeader | null> {
  const { data } = await supabase
    .from("market_conversations")
    .select("id, buyerId:buyer_id, businessId:business_id, shop:market_shops(id, name, slug, logoUrl:logo_url), buyer:market_buyers(name, phone)")
    .eq("id", conversationId)
    .maybeSingle();
  return (data as unknown as ConversationHeader | null) ?? null;
}

export async function loadThread(conversationId: string): Promise<ThreadMessage[]> {
  const { data } = await supabase
    .from("market_messages")
    .select(
      "id, sender, body, photoUrl:photo_url, createdAt:created_at, " +
        "listing:market_listings(promoPrice:promo_price, business:businesses(currency), product:products(id, name, photoUrl:photo_url, salePrice:sale_price)), order:market_orders(number, total, status, currency)"
    )
    .eq("conversation_id", conversationId)
    .order("created_at")
    .limit(500);
  return ((data ?? []) as unknown as {
    id: string;
    sender: "BUYER" | "SELLER";
    body: string | null;
    photoUrl: string | null;
    createdAt: string;
    listing: { promoPrice: number | null; business: { currency: string } | null; product: { id: string; name: string; photoUrl: string | null; salePrice: number } | null } | null;
    order: { number: string; total: number; status: string; currency: string } | null;
  }[]).map((m) => ({
    id: m.id,
    sender: m.sender,
    body: m.body,
    photoUrl: m.photoUrl,
    createdAt: m.createdAt,
    listing: m.listing?.product
      ? { productId: m.listing.product.id, name: m.listing.product.name, photoUrl: m.listing.product.photoUrl, price: m.listing.promoPrice ?? m.listing.product.salePrice, currency: m.listing.business?.currency ?? "XOF" }
      : null,
    order: m.order,
  }));
}

/** Marque la conversation lue par l'acheteur ou par le vendeur. */
export async function markConversationRead(conversationId: string, side: "BUYER" | "SELLER") {
  await supabase
    .from("market_conversations")
    .update(side === "BUYER" ? { buyer_unread: 0 } : { seller_unread: 0 })
    .eq("id", conversationId);
}

/** Nombre de messages non lus (badge de l'en-tête ou de l'onglet Messages). */
export async function countUnread(filter: { buyerId?: string; businessId?: string }): Promise<number> {
  let query = supabase.from("market_conversations").select(filter.buyerId ? "buyer_unread" : "seller_unread");
  query = filter.buyerId ? query.eq("buyer_id", filter.buyerId).gt("buyer_unread", 0) : query.eq("business_id", filter.businessId!).gt("seller_unread", 0);
  const { data } = await query;
  return ((data ?? []) as unknown as Record<string, number>[]).reduce((sum, r) => sum + Number(Object.values(r)[0] ?? 0), 0);
}
