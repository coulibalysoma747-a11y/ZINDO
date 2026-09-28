"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { getCurrentBuyer } from "@/lib/market-buyer";

/** Favoris, avis et signalements du Marché (comptes acheteurs). */

export type SocialResult = { error?: string; needsLogin?: boolean; success?: string };

/** Ajoute ou retire un produit (listingId) ou une boutique suivie (shopId) des favoris. */
export async function toggleFavoriteAction(target: { listingId?: string; shopId?: string }): Promise<SocialResult & { favorite?: boolean }> {
  const buyer = await getCurrentBuyer();
  if (!buyer) return { needsLogin: true };
  const column = target.listingId ? "listing_id" : "shop_id";
  const id = target.listingId ?? target.shopId;
  if (!id) return { error: "Élément introuvable." };

  const { data: existing } = await supabase.from("market_favorites").select("buyer_id").eq("buyer_id", buyer.id).eq(column, id).maybeSingle();
  if (existing) {
    await supabase.from("market_favorites").delete().eq("buyer_id", buyer.id).eq(column, id);
  } else {
    const { error } = await supabase.from("market_favorites").insert({ buyer_id: buyer.id, [column]: id });
    if (error) {
      console.error("[toggleFavoriteAction]", error.message);
      return { error: "Action impossible, réessayez." };
    }
  }
  revalidatePath("/marche/favoris");
  return { favorite: !existing };
}

const reviewSchema = z.object({
  orderId: z.string().min(1),
  productId: z.string().min(1),
  rating: z.number().int().min(1, "Choisissez une note").max(5),
  comment: z.string().trim().max(1000).optional(),
});

/** Avis sur un produit d'une commande livrée (un seul par produit et par commande). */
export async function submitReviewAction(input: z.infer<typeof reviewSchema>): Promise<SocialResult> {
  const buyer = await getCurrentBuyer();
  if (!buyer) return { needsLogin: true };
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Avis invalide" };
  const d = parsed.data;

  const { data: order } = await supabase
    .from("market_orders")
    .select("id, number, status, shopId:shop_id, businessId:business_id, items:market_order_items(productId:product_id)")
    .eq("id", d.orderId)
    .eq("buyer_id", buyer.id)
    .maybeSingle();
  if (!order) return { error: "Commande introuvable." };
  if (order.status !== "LIVREE") return { error: "Vous pourrez donner votre avis une fois la commande livrée." };
  if (!(order.items as { productId: string }[]).some((i) => i.productId === d.productId)) return { error: "Ce produit ne fait pas partie de la commande." };

  const { error } = await supabase.from("market_reviews").upsert(
    {
      order_id: order.id,
      buyer_id: buyer.id,
      business_id: order.businessId,
      shop_id: order.shopId,
      product_id: d.productId,
      rating: d.rating,
      comment: d.comment || null,
    },
    { onConflict: "order_id,product_id" }
  );
  if (error) {
    console.error("[submitReviewAction]", error.message);
    return { error: "Enregistrement impossible, réessayez." };
  }
  revalidatePath(`/marche/commandes/${order.number}`);
  revalidatePath(`/marche/produit/${d.productId}`);
  return { success: "Merci pour votre avis !" };
}

const reportSchema = z.object({
  listingId: z.string().optional(),
  shopId: z.string().optional(),
  reason: z.enum(["INTERDIT", "FRAUDE", "FAUSSE_INFO", "PRIX_TROMPEUR", "CONTREFACON", "INAPPROPRIE", "AUTRE"]),
  details: z.string().trim().max(1000).optional(),
});

/** Signalement d'un produit ou d'une boutique, traité par l'administration ZINDO. */
export async function reportMarketAction(input: z.infer<typeof reportSchema>): Promise<SocialResult> {
  const buyer = await getCurrentBuyer();
  if (!buyer) return { needsLogin: true };
  const parsed = reportSchema.safeParse(input);
  if (!parsed.success || (!parsed.data.listingId && !parsed.data.shopId)) return { error: "Signalement invalide" };
  const d = parsed.data;

  // Un même acheteur ne signale pas deux fois le même élément tant que le signalement est ouvert.
  let dup = supabase.from("market_reports").select("id").eq("buyer_id", buyer.id).eq("status", "OUVERT");
  dup = d.listingId ? dup.eq("listing_id", d.listingId) : dup.eq("shop_id", d.shopId!);
  const { data: existing } = await dup.maybeSingle();
  if (existing) return { success: "Votre signalement est déjà en cours d'examen." };

  const { error } = await supabase.from("market_reports").insert({
    listing_id: d.listingId ?? null,
    shop_id: d.shopId ?? null,
    reason: d.reason,
    details: d.details || null,
    buyer_id: buyer.id,
  });
  if (error) {
    console.error("[reportMarketAction]", error.message);
    return { error: "Envoi impossible, réessayez." };
  }
  return { success: "Merci : l'équipe ZINDO va examiner ce signalement." };
}
