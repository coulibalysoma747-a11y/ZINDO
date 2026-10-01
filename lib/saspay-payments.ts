import "server-only";
import { supabase } from "@/lib/supabase";
import { createSaspayCheckout, getSaspayCheckoutStatus } from "@/lib/saspay";
import { activateInvoicePayment } from "@/lib/subscription-fulfillment";
import { isFeatureEnabled, registerFeatureFlag } from "@/lib/feature-flags";

export const SASPAY_FLAG = "paiement_saspay";
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.zindo.site";
const FAILED_STATUSES = new Set(["FAILED", "CANCELLED", "CANCELED", "EXPIRED"]);

/** Bouton « Payer avec SasPay » : seulement si la clé est configurée ET l'interrupteur activé (désactivé par défaut). */
export async function isSaspayPaymentEnabled(businessId: string): Promise<boolean> {
  if (!process.env.SASPAY_SECRET_KEY) return false;
  await registerFeatureFlag(SASPAY_FLAG, "Paiement par SasPay", "Bouton « Payer avec SasPay » (Orange Money, Moov Money, carte) sur la facture d'abonnement.");
  return isFeatureEnabled(SASPAY_FLAG, businessId);
}

/** Crée le paiement SasPay d'une facture d'abonnement en attente et renvoie l'adresse où envoyer le client. */
export async function startSaspayInvoicePayment(params: {
  businessId: string;
  invoiceId: string;
  customer: { name: string; email: string | null; phone: string | null };
}): Promise<{ url: string } | { error: string }> {
  const { data: invoice } = await supabase
    .from("subscription_invoices")
    .select("id, number, planLabel:plan_label, amount, status")
    .eq("id", params.invoiceId)
    .eq("business_id", params.businessId)
    .maybeSingle();
  if (!invoice) return { error: "Facture introuvable" };
  if (invoice.status !== "EN_ATTENTE") return { error: "Cette facture n'est plus en attente de paiement" };

  let checkout;
  try {
    checkout = await createSaspayCheckout({
      amount: Number(invoice.amount),
      currency: "XOF",
      customerName: params.customer.name,
      customerEmail: params.customer.email || `abonne-${params.businessId.slice(0, 8)}@zindo.site`,
      customerPhone: params.customer.phone ?? undefined,
      description: `Abonnement ZINDO — ${invoice.planLabel} (${invoice.number})`,
      returnUrl: `${SITE_URL}/abonnement`,
      metadata: { purpose: "ABONNEMENT", invoiceId: invoice.id as string },
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Le paiement n'a pas pu être créé." };
  }
  if (!checkout.checkoutUrl) return { error: "SasPay n'a pas renvoyé de page de paiement. Réessayez." };

  const { error } = await supabase
    .from("saspay_payments")
    .insert({ business_id: params.businessId, purpose: "ABONNEMENT", target_id: invoice.id, saspay_id: checkout.id, amount: Number(invoice.amount) });
  if (error) {
    console.error("[saspay] Enregistrement du paiement impossible :", error.message);
    return { error: "Impossible d'enregistrer le paiement" };
  }
  return { url: checkout.checkoutUrl };
}

/**
 * Relit chez SasPay chaque paiement en attente (les siens, ou tous si `businessId` est omis) et active ce qui est payé.
 * Seule la relecture du statut décide : jamais le contenu d'une confirmation reçue. Idempotent et sans double activation.
 */
export async function reconcileSaspayPayments(businessId?: string): Promise<number> {
  let query = supabase
    .from("saspay_payments")
    .select("id, purpose, targetId:target_id, saspayId:saspay_id")
    .eq("status", "PENDING")
    .order("created_at", { ascending: false })
    .limit(50);
  if (businessId) query = query.eq("business_id", businessId);
  const { data } = await query;
  let confirmed = 0;

  for (const p of (data ?? []) as { id: string; purpose: string; targetId: string; saspayId: string }[]) {
    let status;
    try {
      status = await getSaspayCheckoutStatus(p.saspayId);
    } catch {
      continue;
    }
    if (status.paid) {
      // Verrou : une seule confirmation par paiement, même si la page et la confirmation arrivent ensemble.
      const { data: claimed } = await supabase
        .from("saspay_payments")
        .update({ status: "PAID", paid_at: new Date().toISOString() })
        .eq("id", p.id)
        .eq("status", "PENDING")
        .select("id");
      if (!claimed || claimed.length === 0) continue;
      if (p.purpose === "ABONNEMENT") {
        let result = await activateInvoicePayment({ invoiceId: p.targetId, method: "SASPAY", reference: p.saspayId });
        // Étiquette SASPAY absente de la base (SQL pas encore lancé) : on active quand même, notée « Manuel ».
        if ("error" in result) result = await activateInvoicePayment({ invoiceId: p.targetId, method: "MANUEL", reference: `saspay:${p.saspayId}` });
        if ("error" in result) {
          console.error("[saspay] Paiement reçu mais activation impossible :", p.saspayId, result.error);
          await supabase.from("saspay_payments").update({ status: "PENDING", paid_at: null }).eq("id", p.id);
          continue;
        }
      }
      confirmed++;
    } else if (FAILED_STATUSES.has(status.status.toUpperCase())) {
      await supabase.from("saspay_payments").update({ status: "FAILED" }).eq("id", p.id).eq("status", "PENDING");
    }
  }
  return confirmed;
}
