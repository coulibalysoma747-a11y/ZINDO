"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { PERMISSIONS } from "@/lib/permissions";
import { getCurrentBuyer } from "@/lib/market-buyer";
import { requireMarketSeller } from "@/lib/market-seller";
import { sendPushToBusiness } from "@/lib/push";
import { createSignedImageUpload, isOwnUploadUrl } from "@/lib/photo-upload";

/** Messagerie du Marché : l'acheteur écrit à une boutique, le vendeur répond depuis ZINDO. */

/** Ouvre (ou retrouve) la conversation de l'acheteur connecté avec une boutique. */
export async function openConversationAction(shopId: string): Promise<{ id?: string; needsLogin?: boolean; error?: string }> {
  const buyer = await getCurrentBuyer();
  if (!buyer) return { needsLogin: true };
  const { data: shop } = await supabase.from("market_shops").select("id, businessId:business_id").eq("id", shopId).eq("published", true).eq("suspended", false).maybeSingle();
  if (!shop) return { error: "Boutique introuvable." };
  const { data: existing } = await supabase.from("market_conversations").select("id").eq("buyer_id", buyer.id).eq("shop_id", shopId).maybeSingle();
  if (existing) return { id: existing.id as string };
  const { data, error } = await supabase.from("market_conversations").insert({ buyer_id: buyer.id, shop_id: shopId, business_id: shop.businessId }).select("id").single();
  if (error || !data) {
    // Deux clics simultanés : l'autre requête a créé la conversation.
    const { data: again } = await supabase.from("market_conversations").select("id").eq("buyer_id", buyer.id).eq("shop_id", shopId).maybeSingle();
    return again ? { id: again.id as string } : { error: "Ouverture impossible, réessayez." };
  }
  return { id: data.id as string };
}

/** Adresse d'envoi signée pour une photo jointe par un acheteur connecté. */
export async function createBuyerImageUploadAction(_folder: string, contentType: string) {
  if (!(await getCurrentBuyer())) return { error: "Connectez-vous." };
  return createSignedImageUpload("messages", contentType);
}

const messageSchema = z.object({
  conversationId: z.string().min(1),
  body: z.string().max(2000, "Message trop long (2 000 caractères maximum)").optional(),
  photoUrl: z.string().optional(),
  listingId: z.string().optional(),
  orderId: z.string().optional(),
});

type MessageInput = z.infer<typeof messageSchema>;

function validate(input: MessageInput): { data?: MessageInput; error?: string } {
  const parsed = messageSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Message invalide" };
  const d = parsed.data;
  if (!d.body?.trim() && !d.photoUrl && !d.listingId && !d.orderId) return { error: "Écrivez un message." };
  if (d.photoUrl && !isOwnUploadUrl(d.photoUrl)) return { error: "Photo invalide." };
  return { data: d };
}

async function send(conversationId: string, sender: "BUYER" | "SELLER", d: MessageInput) {
  return supabase.rpc("market_send_message", {
    p_conversation: conversationId,
    p_sender: sender,
    p_body: d.body ?? null,
    p_photo: d.photoUrl ?? null,
    p_listing: d.listingId ?? null,
    p_order: d.orderId ?? null,
  });
}

export async function sendBuyerMessageAction(input: MessageInput): Promise<{ error?: string; needsLogin?: boolean }> {
  const buyer = await getCurrentBuyer();
  if (!buyer) return { needsLogin: true };
  const { data: d, error: invalid } = validate(input);
  if (!d) return { error: invalid };

  const { data: conversation } = await supabase
    .from("market_conversations")
    .select("id, businessId:business_id, shopId:shop_id, sellerUnread:seller_unread")
    .eq("id", d.conversationId)
    .eq("buyer_id", buyer.id)
    .maybeSingle();
  if (!conversation) return { error: "Conversation introuvable." };
  // Pièces jointes : uniquement un produit de cette boutique, ou une commande de cet acheteur à cette boutique.
  if (d.listingId) {
    const { data } = await supabase.from("market_listings").select("id").eq("id", d.listingId).eq("business_id", conversation.businessId).maybeSingle();
    if (!data) d.listingId = undefined;
  }
  if (d.orderId) {
    const { data } = await supabase.from("market_orders").select("id").eq("id", d.orderId).eq("buyer_id", buyer.id).eq("shop_id", conversation.shopId).maybeSingle();
    if (!data) d.orderId = undefined;
  }

  const { error } = await send(conversation.id, "BUYER", d);
  if (error) {
    console.error("[sendBuyerMessageAction]", error.message);
    return { error: "Envoi impossible, réessayez." };
  }
  // Le vendeur est prévenu au premier message non lu (pas une notification par message).
  if (!conversation.sellerUnread) {
    const link = `/mon-marche/messages/${conversation.id}`;
    const preview = d.body?.trim().slice(0, 100) || "📷 Pièce jointe";
    await supabase.from("notifications").insert({ business_id: conversation.businessId, type: "INFO", title: `Nouveau message de ${buyer.name}`, message: preview, link });
    await sendPushToBusiness(conversation.businessId, { title: `💬 ${buyer.name}`, body: preview, link });
  }
  revalidatePath(`/marche/messages/${conversation.id}`);
  return {};
}

export async function sendSellerMessageAction(input: MessageInput): Promise<{ error?: string }> {
  const { user } = await requireMarketSeller(PERMISSIONS.SALES_CREATE);
  const { data: d, error: invalid } = validate(input);
  if (!d) return { error: invalid };
  const { data: conversation } = await supabase.from("market_conversations").select("id").eq("id", d.conversationId).eq("business_id", user.businessId).maybeSingle();
  if (!conversation) return { error: "Conversation introuvable." };
  const { error } = await send(conversation.id, "SELLER", { ...d, listingId: undefined, orderId: undefined });
  if (error) {
    console.error("[sendSellerMessageAction]", error.message);
    return { error: "Envoi impossible, réessayez." };
  }
  revalidatePath(`/mon-marche/messages/${conversation.id}`);
  return {};
}
