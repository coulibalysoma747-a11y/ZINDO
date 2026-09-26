import "server-only";
import { isFeatureEnabled, registerFeatureFlag } from "@/lib/feature-flags";
import { supabase } from "@/lib/supabase";
import { formatMoney } from "@/lib/format";

const EVENING_REPORT_FLAG = "rapport_soir_whatsapp";

export async function isEveningReportEnabled(businessId: string): Promise<boolean> {
  await registerFeatureFlag(
    EVENING_REPORT_FLAG,
    "Rapport du soir par WhatsApp / SMS",
    "Après la fermeture de caisse, un bouton « Envoyer au gérant » ouvre WhatsApp (ou les SMS) avec le bilan déjà rédigé : ventes, espèces, mobile money par opérateur, crédit, clôturé par qui."
  );
  return isFeatureEnabled(EVENING_REPORT_FLAG, businessId);
}

const OPERATOR_LABELS: Record<string, string> = { ORANGE: "Orange Money", MOOV: "Moov Money", WAVE: "Wave" };

/** Montant sans devise (« 200 000 ») : plus court à lire dans un message. */
function amount(n: number) {
  return formatMoney(n).replace(/\s*(FCFA|F CFA|XOF)$/i, "");
}

/**
 * Texte du bilan : « ZINDO - Bilan du 25/09 (Boutique) : Ventes = 250 000 FCFA,
 * Espèces = 200 000, Orange Money = 50 000. Clôturé par Paul. »
 */
export async function buildEveningReportText(input: {
  sessionId: string;
  businessId: string;
  locationName: string;
  closedAt: Date;
  cashierName: string;
  salesCount: number;
  totalRevenue: number;
  cashCollected: number;
  mobileCollected: number;
  cardCollected: number;
  otherCollected: number;
  creditCollected: number;
  variance: number;
  currency: string;
}): Promise<string> {
  // Mobile money détaillé par opérateur quand chaque vente le précise ; sinon
  // (paiements mixtes, opérateur non renseigné) un seul total « Mobile Money ».
  let mobileParts: string[] = input.mobileCollected > 0 ? [`Mobile Money = ${amount(input.mobileCollected)}`] : [];
  if (input.mobileCollected > 0) {
    const { data } = await supabase
      .from("sales")
      .select("amountPaid:amount_paid, operator:mobile_money_operator")
      .eq("business_id", input.businessId)
      .eq("session_id", input.sessionId)
      .eq("payment_method", "MOBILE_MONEY")
      .neq("status", "ANNULEE");
    const byOperator = new Map<string, number>();
    for (const s of (data ?? []) as Array<{ amountPaid: number; operator: string | null }>) {
      const key = s.operator ?? "";
      byOperator.set(key, (byOperator.get(key) ?? 0) + s.amountPaid);
    }
    const sum = [...byOperator.values()].reduce((a, b) => a + b, 0);
    if (!byOperator.has("") && byOperator.size > 0 && Math.round(sum) === Math.round(input.mobileCollected)) {
      mobileParts = [...byOperator.entries()]
        .filter(([, v]) => v > 0)
        .map(([op, v]) => `${OPERATOR_LABELS[op] ?? op} = ${amount(v)}`);
    }
  }

  const date = input.closedAt.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", timeZone: "Africa/Ouagadougou" });
  const parts = [
    `Ventes = ${formatMoney(input.totalRevenue, input.currency)} (${input.salesCount} vente${input.salesCount > 1 ? "s" : ""})`,
    `Espèces = ${amount(input.cashCollected)}`,
    ...mobileParts,
    ...(input.cardCollected > 0 ? [`Carte = ${amount(input.cardCollected)}`] : []),
    ...(input.otherCollected > 0 ? [`Autre = ${amount(input.otherCollected)}`] : []),
    ...(input.creditCollected > 0 ? [`Acomptes sur crédit = ${amount(input.creditCollected)}`] : []),
    ...(input.variance !== 0 ? [`Écart de caisse = ${input.variance > 0 ? "+" : "−"}${amount(Math.abs(input.variance))}`] : []),
  ];
  return `ZINDO - Bilan du ${date} (${input.locationName}) : ${parts.join(", ")}. Clôturé par ${input.cashierName}.`;
}
