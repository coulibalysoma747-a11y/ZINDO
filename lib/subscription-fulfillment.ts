import "server-only";
import { supabase } from "@/lib/supabase";
import type { InvoicePaymentMethod } from "@/lib/db-types";
import { ACTIVE_PLAN_KEY } from "@/lib/subscription";
import { rewardReferrerOnFirstPayment } from "@/lib/referral";

function addPeriod(billingCycle: "MONTHLY" | "ANNUAL", from: Date) {
  const next = new Date(from);
  if (billingCycle === "ANNUAL") next.setFullYear(next.getFullYear() + 1);
  else next.setMonth(next.getMonth() + 1);
  return next;
}

/** Marque une facture d'abonnement comme payée et active/renouvelle l'abonnement du commerce. Idempotent. */
export async function activateInvoicePayment(params: {
  invoiceId: string;
  method: InvoicePaymentMethod;
  reference?: string;
}) {
  const { data: invoice } = await supabase
    .from("subscription_invoices")
    .select("id, businessId:business_id, planKey:plan_key, billingCycle:billing_cycle, status, paymentReference:payment_reference")
    .eq("id", params.invoiceId)
    .maybeSingle();
  if (!invoice) return { error: "Facture introuvable" };
  if (invoice.status === "PAYEE") return { success: true, alreadyProcessed: true };
  if (invoice.status === "ANNULEE") return { error: "Cette facture a été annulée" };

  // Toujours le palier vendu (Pro), même pour une ancienne facture "standard"
  // encore en attente : confirmer son paiement ne doit pas réactiver un ancien palier.
  const { data: plan } = await supabase
    .from("subscription_plans")
    .select("id")
    .eq("key", ACTIVE_PLAN_KEY)
    .maybeSingle();
  if (!plan) return { error: "Palier introuvable" };

  const now = new Date();
  // Un renouvellement anticipé (ou un mois offert par parrainage) ne doit pas
  // faire perdre les jours restants : la nouvelle période part de la fin de
  // l'abonnement en cours quand celle-ci est encore dans le futur.
  const { data: currentSub } = await supabase
    .from("business_subscriptions")
    .select("status, currentPeriodEnd:current_period_end")
    .eq("business_id", invoice.businessId)
    .maybeSingle();
  const currentEnd = currentSub?.status === "ACTIVE" && currentSub.currentPeriodEnd ? new Date(currentSub.currentPeriodEnd as string) : null;
  const periodEnd = addPeriod(invoice.billingCycle as "MONTHLY" | "ANNUAL", currentEnd && currentEnd > now ? currentEnd : now);

  const { error: invoiceError } = await supabase
    .from("subscription_invoices")
    .update({
      status: "PAYEE",
      paid_at: now.toISOString(),
      payment_method: params.method,
      payment_reference: params.reference ?? (invoice.paymentReference as string | null),
    })
    .eq("id", invoice.id);
  if (invoiceError) {
    console.error("[activateInvoicePayment] Échec de la mise à jour de la facture :", invoiceError.message);
    return { error: "Impossible de confirmer le paiement" };
  }

  const { error: subError } = await supabase.from("business_subscriptions").upsert(
    {
      business_id: invoice.businessId,
      plan_id: plan.id,
      billing_cycle: invoice.billingCycle,
      status: "ACTIVE",
      current_period_end: periodEnd.toISOString(),
    },
    { onConflict: "business_id", ignoreDuplicates: false }
  );
  if (subError) {
    console.error("[activateInvoicePayment] Échec de la mise à jour de l'abonnement :", subError.message);
    return { error: "Facture confirmée mais l'abonnement n'a pas pu être mis à jour — contactez le support" };
  }

  // Premier paiement d'un filleul : récompense du parrain (sans effet si le
  // commerce n'a pas été parrainé ou si c'est déjà fait).
  await rewardReferrerOnFirstPayment(invoice.businessId as string);

  return { success: true, alreadyProcessed: false };
}
