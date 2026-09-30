import "server-only";
import { supabase } from "@/lib/supabase";
import { isFeatureEnabled, registerFeatureFlag } from "@/lib/feature-flags";
import { sendPushToBusiness } from "@/lib/push";
import { formatMoney } from "@/lib/format";

const SALE_CANCEL_ALERT_FLAG = "alerte_vente_annulee";

export async function ensureSaleCancelAlertFlagRegistered() {
  await registerFeatureFlag(
    SALE_CANCEL_ALERT_FLAG,
    "Alerte vente annulée / supprimée",
    "Prévient le commerce quand une vente est annulée, quand une vente annulée est supprimée, ou quand les ventes sont effacées depuis la Zone de danger : notification sur les appareils qui l'ont activée et dans la liste des notifications. Ajoute aussi la suppression d'une vente annulée (droit « Supprimer une vente annulée », Administrateur seulement par défaut)."
  );
}

export async function isSaleCancelAlertEnabled(businessId: string): Promise<boolean> {
  await ensureSaleCancelAlertFlagRegistered();
  return isFeatureEnabled(SALE_CANCEL_ALERT_FLAG, businessId);
}

/** Ligne dans /notifications + push. Ne fait jamais échouer l'action qui l'appelle. */
async function sendSaleAlert(businessId: string, title: string, message: string, link: string | null) {
  try {
    if (!(await isSaleCancelAlertEnabled(businessId))) return;
    const { error } = await supabase
      .from("notifications")
      .insert({ business_id: businessId, type: "INFO", title, message, link });
    if (error) console.error("[sendSaleAlert] Échec de l'insertion :", error.message);
    await sendPushToBusiness(businessId, { title, body: message, link: link ?? undefined });
  } catch (e) {
    console.error("[sendSaleAlert] Erreur :", e);
  }
}

function motifSuffix(reason?: string) {
  return reason?.trim() ? ` — motif : ${reason.trim()}` : "";
}

export async function sendSaleCancelAlert(input: {
  businessId: string;
  saleId: string;
  saleNumber: string;
  total: number;
  currency: string;
  userName: string;
  reason?: string;
}) {
  await sendSaleAlert(
    input.businessId,
    "Vente annulée",
    `Vente ${input.saleNumber} (${formatMoney(input.total, input.currency)}) annulée par ${input.userName}${motifSuffix(input.reason)}.`,
    `/ventes/${input.saleId}`
  );
}

export async function sendSaleDeleteAlert(input: {
  businessId: string;
  saleNumber: string;
  total: number;
  currency: string;
  userName: string;
}) {
  await sendSaleAlert(
    input.businessId,
    "Vente supprimée",
    `Vente annulée ${input.saleNumber} (${formatMoney(input.total, input.currency)}) supprimée définitivement par ${input.userName}.`,
    "/ventes/historique"
  );
}

export async function sendSalesWipeAlert(input: { businessId: string; userName: string; locationName?: string | null }) {
  const scope = input.locationName ? `de la boutique « ${input.locationName} »` : "du commerce";
  await sendSaleAlert(
    input.businessId,
    "Ventes effacées",
    `Toutes les ventes ${scope} ont été effacées depuis la Zone de danger par ${input.userName}.`,
    "/ventes/historique"
  );
}
