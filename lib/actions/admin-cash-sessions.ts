"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { requireSuperAdmin } from "@/lib/superadmin-auth";
import { logAdminAction } from "@/lib/admin-audit";
import { logAction } from "@/lib/audit";
import { computeSessionStats } from "@/lib/cash-sessions";

export type AdminCashSessionActionResult = { success?: string; error?: string };

/**
 * Débloque un commerce dont toutes les ventes sont bloquées parce qu'une
 * session de caisse reste "OUVERTE" (ex. employé parti/déconnecté, appareil
 * perdu) — sales.ts refuse toute nouvelle vente tant qu'aucune session
 * ouverte n'existe pour la boutique, et openSessionAction refuse d'en ouvrir
 * une seconde. Réservé au SuperAdmin, comme les autres corrections
 * cross-commerce (adminUpdateSaleAction, toggleUserActiveAction).
 *
 * countedCash est facultatif : si le fondateur ne connaît pas le montant réel
 * en caisse, on clôture sur le montant attendu (écart 0) plutôt que de
 * bloquer la correction — le commerçant pourra toujours faire son propre
 * inventaire de caisse ensuite.
 */
export async function adminForceCloseSessionAction(
  businessId: string,
  sessionId: string,
  countedCash?: number
): Promise<AdminCashSessionActionResult> {
  const admin = await requireSuperAdmin();

  const { data: session } = await supabase
    .from("cash_sessions")
    .select("id, businessId:business_id, locationId:location_id, openingAmount:opening_amount, openedAt:opened_at, status, userId:user_id")
    .eq("id", sessionId)
    .eq("business_id", businessId)
    .maybeSingle();
  if (!session) return { error: "Session de caisse introuvable" };
  if (session.status === "FERMEE") return { error: "Cette session est déjà clôturée" };

  const closedAt = new Date();
  const stats = await computeSessionStats({
    businessId: session.businessId as string,
    locationId: session.locationId as string,
    sessionId: session.id as string,
    openingAmount: session.openingAmount as number,
    openedAt: new Date(session.openedAt as string),
    closedAt,
  });
  const finalCounted = Number.isFinite(countedCash) ? (countedCash as number) : stats.expectedCash;
  const variance = finalCounted - stats.expectedCash;
  const note = `[Clôture forcée par l'administrateur plateforme — ${admin.name}]`;

  const { error } = await supabase
    .from("cash_sessions")
    .update({
      status: "FERMEE",
      closed_at: closedAt.toISOString(),
      counted_cash: finalCounted,
      note,
      sales_count: stats.salesCount,
      total_revenue: stats.totalRevenue,
      cash_collected: stats.cashCollected,
      mobile_collected: stats.mobileCollected,
      card_collected: stats.cardCollected,
      other_collected: stats.otherCollected,
      credit_collected: stats.creditCollected,
      gross_margin: stats.grossMargin,
      expenses_total: stats.expensesTotal,
      net_margin: stats.netMargin,
      margin_rate: stats.marginRate,
      expected_cash: stats.expectedCash,
      variance,
    })
    .eq("id", session.id);
  if (error) {
    console.error("[adminForceCloseSessionAction] Échec de la clôture :", error.message);
    return { error: "Impossible de clôturer cette session" };
  }

  await logAction({
    businessId,
    userId: session.userId as string,
    action: "CLOSE",
    entity: "CashSession",
    entityId: session.id as string,
    details: `${note} — compté ${finalCounted}, écart ${variance}`,
  });
  await logAdminAction({
    superAdminId: admin.id,
    actorName: admin.name,
    action: "CLOSE",
    entity: "CashSession",
    entityId: session.id as string,
    details: `Session ${session.id} clôturée de force (compte ${session.userId}) — compté ${finalCounted}, écart ${variance}`,
  });

  revalidatePath(`/admin/commercants/${businessId}`);
  revalidatePath("/ventes");
  revalidatePath("/ventes/sessions");

  return { success: "Session de caisse clôturée — le commerçant peut de nouveau encaisser" };
}
