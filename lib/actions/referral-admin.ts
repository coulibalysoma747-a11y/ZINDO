"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { requireSuperAdmin } from "@/lib/superadmin-auth";
import { logAdminAction } from "@/lib/admin-audit";
import { extendSubscription } from "@/lib/referral";

/**
 * Annule un parrainage suspect (faux compte, auto-parrainage non détecté...).
 * Si la récompense avait déjà été accordée, les mois offerts sont retirés de
 * l'abonnement du parrain.
 */
export async function cancelReferralAction(referralId: string, reason: string) {
  const admin = await requireSuperAdmin();
  if (!reason.trim()) return { error: "Indiquez la raison de l'annulation" };

  const { data: referral } = await supabase
    .from("referrals")
    .select("id, referrerId:referrer_business_id, status, rewardMonths:reward_months")
    .eq("id", referralId)
    .maybeSingle();
  if (!referral) return { error: "Parrainage introuvable" };
  if (referral.status === "ANNULE") return { success: "Déjà annulé" };

  const { error } = await supabase
    .from("referrals")
    .update({ status: "ANNULE", cancelled_reason: reason.trim() })
    .eq("id", referral.id);
  if (error) return { error: "Impossible d'annuler le parrainage" };

  const months = (referral.rewardMonths as number) ?? 0;
  if (referral.status === "VALIDE" && months > 0) {
    await extendSubscription(referral.referrerId as string, -months);
  }

  await logAdminAction({
    superAdminId: admin.id,
    actorName: admin.name,
    action: "CANCEL",
    entity: "Referral",
    entityId: referral.id as string,
    details: `Parrainage annulé${months > 0 && referral.status === "VALIDE" ? ` (−${months} mois retiré au parrain)` : ""} : ${reason.trim()}`,
  });
  revalidatePath("/admin/parrainages");
  return { success: "Parrainage annulé" };
}
