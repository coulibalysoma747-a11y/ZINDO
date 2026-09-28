"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { requireSuperAdmin } from "@/lib/superadmin-auth";
import { logAdminAction } from "@/lib/admin-audit";

/** Administration du Marché ZINDO (console /admin/marche) : boutiques, annonces, signalements, avis. */

type Result = { error?: string; success?: string };

function refresh() {
  revalidatePath("/admin/marche");
  revalidatePath("/marche", "layout");
}

/** Suspend (motif obligatoire) ou rétablit une boutique : suspendue, elle disparaît du Marché. */
export async function setShopSuspendedAction(shopId: string, suspended: boolean, reason?: string): Promise<Result> {
  const admin = await requireSuperAdmin();
  if (suspended && !reason?.trim()) return { error: "Indiquez le motif de la suspension." };
  const { data: shop, error } = await supabase
    .from("market_shops")
    .update({ suspended, suspended_reason: suspended ? reason!.trim() : null })
    .eq("id", shopId)
    .select("name")
    .single();
  if (error || !shop) return { error: "Boutique introuvable." };
  await logAdminAction({
    superAdminId: admin.id,
    actorName: admin.name,
    action: suspended ? "SUSPEND" : "RESTORE",
    entity: "market_shop",
    entityId: shopId,
    details: `${shop.name}${suspended ? ` : ${reason}` : ""}`,
  });
  refresh();
  return { success: suspended ? "Boutique suspendue." : "Boutique rétablie." };
}

/** Retire (motif obligatoire) ou rétablit une annonce qui ne respecte pas les règles. */
export async function setListingRemovedAction(listingId: string, removed: boolean, reason?: string): Promise<Result> {
  const admin = await requireSuperAdmin();
  if (removed && !reason?.trim()) return { error: "Indiquez le motif du retrait." };
  const { data: listing, error } = await supabase
    .from("market_listings")
    .update({ removed_by_admin: removed, removed_reason: removed ? reason!.trim() : null })
    .eq("id", listingId)
    .select("product:products(name)")
    .single();
  if (error || !listing) return { error: "Annonce introuvable." };
  await logAdminAction({
    superAdminId: admin.id,
    actorName: admin.name,
    action: removed ? "REMOVE" : "RESTORE",
    entity: "market_listing",
    entityId: listingId,
    details: `${(listing.product as unknown as { name: string } | null)?.name ?? ""}${removed ? ` : ${reason}` : ""}`,
  });
  refresh();
  return { success: removed ? "Annonce retirée du Marché." : "Annonce rétablie." };
}

/** Clôt un signalement (traité ou rejeté). */
export async function closeReportAction(reportId: string, status: "TRAITE" | "REJETE"): Promise<Result> {
  const admin = await requireSuperAdmin();
  const { error } = await supabase.from("market_reports").update({ status, handled_at: new Date().toISOString() }).eq("id", reportId);
  if (error) return { error: "Signalement introuvable." };
  await logAdminAction({ superAdminId: admin.id, actorName: admin.name, action: status, entity: "market_report", entityId: reportId });
  refresh();
  return { success: status === "TRAITE" ? "Signalement traité." : "Signalement rejeté." };
}

/** Masque ou réaffiche un avis (injurieux, faux…). */
export async function setReviewHiddenAction(reviewId: string, hidden: boolean): Promise<Result> {
  const admin = await requireSuperAdmin();
  const { error } = await supabase.from("market_reviews").update({ hidden }).eq("id", reviewId);
  if (error) return { error: "Avis introuvable." };
  await logAdminAction({ superAdminId: admin.id, actorName: admin.name, action: hidden ? "HIDE" : "SHOW", entity: "market_review", entityId: reviewId });
  refresh();
  return { success: hidden ? "Avis masqué." : "Avis réaffiché." };
}

/** Bloque ou débloque un compte acheteur (fraude, faux comptes). */
export async function setBuyerBlockedAction(buyerId: string, blocked: boolean): Promise<Result> {
  const admin = await requireSuperAdmin();
  const { data: buyer, error } = await supabase.from("market_buyers").update({ blocked }).eq("id", buyerId).select("name, phone").single();
  if (error || !buyer) return { error: "Acheteur introuvable." };
  await logAdminAction({
    superAdminId: admin.id,
    actorName: admin.name,
    action: blocked ? "BLOCK" : "UNBLOCK",
    entity: "market_buyer",
    entityId: buyerId,
    details: `${buyer.name} (${buyer.phone})`,
  });
  refresh();
  return { success: blocked ? "Acheteur bloqué." : "Acheteur débloqué." };
}

/** Valide une recharge de portefeuille : le solde du vendeur est crédité (une seule fois). */
export async function validateTopupAction(topupId: string): Promise<Result> {
  const admin = await requireSuperAdmin();
  const { data: balance, error } = await supabase.rpc("market_validate_topup", { p_topup_id: topupId, p_admin: admin.id });
  if (error) return { error: error.message.includes("DEJA") ? "Recharge déjà traitée." : "Recharge introuvable." };
  await logAdminAction({ superAdminId: admin.id, actorName: admin.name, action: "VALIDATE", entity: "market_topup", entityId: topupId, details: `Nouveau solde : ${balance} FCFA` });
  refresh();
  return { success: "Recharge validée : portefeuille crédité." };
}

/** Refuse une recharge (transfert introuvable, montant différent…) ; le vendeur voit le motif. */
export async function rejectTopupAction(topupId: string, reason?: string): Promise<Result> {
  const admin = await requireSuperAdmin();
  if (!reason?.trim()) return { error: "Indiquez le motif du refus." };
  const { data, error } = await supabase
    .from("market_topups")
    .update({ status: "REFUSEE", reject_reason: reason.trim(), reviewed_at: new Date().toISOString(), reviewed_by: admin.id })
    .eq("id", topupId)
    .eq("status", "EN_ATTENTE")
    .select("id");
  if (error || !data?.length) return { error: "Recharge introuvable ou déjà traitée." };
  await logAdminAction({ superAdminId: admin.id, actorName: admin.name, action: "REJECT", entity: "market_topup", entityId: topupId, details: reason.trim() });
  refresh();
  return { success: "Recharge refusée." };
}

/** Modifie le prix (ou désactive) une durée de mise en avant. */
export async function updateBoostPriceAction(kind: "PRODUIT" | "BOUTIQUE", days: number, price: number, active: boolean): Promise<Result> {
  const admin = await requireSuperAdmin();
  if (!Number.isInteger(price) || price < 0) return { error: "Prix invalide." };
  const { error } = await supabase.from("market_boost_prices").update({ price, active }).eq("kind", kind).eq("days", days);
  if (error) return { error: "Mise à jour impossible." };
  await logAdminAction({ superAdminId: admin.id, actorName: admin.name, action: "UPDATE", entity: "market_boost_price", details: `${kind} ${days} j : ${price} FCFA${active ? "" : " (désactivé)"}` });
  refresh();
  return { success: "Tarif enregistré." };
}
