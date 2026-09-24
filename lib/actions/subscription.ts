"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { requireUserForBilling } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { generateSubscriptionInvoiceNumber } from "@/lib/reference";
import { ACTIVE_PLAN_KEY } from "@/lib/subscription";

export type ActionState = { error?: string; success?: string } | undefined;

const cycleSchema = z.object({ billingCycle: z.enum(["MONTHLY", "ANNUAL"]) });

export type CreateInvoiceResult = { success: true; invoiceId: string } | { success: false; error: string };

/** Crée une facture d'abonnement "pro" en attente de paiement manuel. */
export async function createSubscriptionInvoiceAction(billingCycle: "MONTHLY" | "ANNUAL"): Promise<CreateInvoiceResult> {
  const user = await requireUserForBilling();
  const parsed = cycleSchema.safeParse({ billingCycle });
  if (!parsed.success) return { success: false, error: "Cycle de facturation invalide" };

  const { data: plan } = await supabase
    .from("subscription_plans")
    .select("id, key, label, monthlyPrice:monthly_price, annualPrice:annual_price")
    .eq("key", ACTIVE_PLAN_KEY)
    .maybeSingle();
  if (!plan) return { success: false, error: "Palier d'abonnement introuvable — contactez le support" };

  const { data: existingPending } = await supabase
    .from("subscription_invoices")
    .select("id, planKey:plan_key, paymentReference:payment_reference")
    .eq("business_id", user.businessId)
    .eq("status", "EN_ATTENTE")
    .maybeSingle();
  if (existingPending) {
    // Une ancienne facture (palier retiré, ancien prix) sans paiement déclaré est
    // annulée et remplacée par une facture Pro ; si un paiement a déjà été
    // déclaré, on la garde pour que l'admin puisse la confirmer.
    const isLegacy = existingPending.planKey !== plan.key;
    if (!isLegacy || existingPending.paymentReference) return { success: true, invoiceId: existingPending.id as string };
    await supabase.from("subscription_invoices").update({ status: "ANNULEE" }).eq("id", existingPending.id).eq("status", "EN_ATTENTE");
  }

  const amount = (parsed.data.billingCycle === "ANNUAL" ? plan.annualPrice : plan.monthlyPrice) as number;
  const number = await generateSubscriptionInvoiceNumber(user.businessId);
  const { data: invoice, error } = await supabase
    .from("subscription_invoices")
    .insert({
      business_id: user.businessId,
      number,
      plan_key: plan.key,
      plan_label: plan.label,
      billing_cycle: parsed.data.billingCycle,
      amount,
    })
    .select("id")
    .single();
  if (error || !invoice) {
    console.error("[createSubscriptionInvoiceAction] Échec de la création de la facture :", error?.message);
    return { success: false, error: "Impossible de créer la facture" };
  }

  await logAction({
    businessId: user.businessId,
    userId: user.id,
    action: "CREATE",
    entity: "SubscriptionInvoice",
    entityId: invoice.id as string,
    details: `${plan.label} (${parsed.data.billingCycle})`,
  });

  revalidatePath("/abonnement");
  return { success: true, invoiceId: invoice.id as string };
}

const proofSchema = z.object({
  invoiceId: z.string().min(1),
  reference: z.string().min(2, "Indiquez la référence du paiement"),
  note: z.string().optional(),
});

export async function submitPaymentProofAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUserForBilling();
  const parsed = proofSchema.safeParse({
    invoiceId: formData.get("invoiceId"),
    reference: formData.get("reference"),
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const { data: invoice } = await supabase
    .from("subscription_invoices")
    .select("id, status")
    .eq("id", parsed.data.invoiceId)
    .eq("business_id", user.businessId)
    .maybeSingle();
  if (!invoice) return { error: "Facture introuvable" };
  if (invoice.status !== "EN_ATTENTE") return { error: "Cette facture a déjà été traitée" };

  const { error } = await supabase
    .from("subscription_invoices")
    .update({ payment_method: "MANUEL", payment_reference: parsed.data.reference, proof_note: parsed.data.note ?? null })
    .eq("id", invoice.id);
  if (error) {
    console.error("[submitPaymentProofAction] Échec de la mise à jour :", error.message);
    return { error: "Impossible d'enregistrer la référence de paiement" };
  }

  await logAction({
    businessId: user.businessId,
    userId: user.id,
    action: "UPDATE",
    entity: "SubscriptionInvoice",
    entityId: invoice.id as string,
    details: "Référence de paiement soumise",
  });

  revalidatePath("/abonnement");
  return { success: "Référence envoyée — un administrateur va confirmer votre paiement sous peu." };
}

export async function cancelPendingInvoiceAction(invoiceId: string) {
  const user = await requireUserForBilling();
  const { data: invoice } = await supabase
    .from("subscription_invoices")
    .select("id, status")
    .eq("id", invoiceId)
    .eq("business_id", user.businessId)
    .maybeSingle();
  if (!invoice) return { error: "Facture introuvable" };
  if (invoice.status !== "EN_ATTENTE") return { error: "Seule une facture en attente peut être annulée" };

  const { error } = await supabase.from("subscription_invoices").update({ status: "ANNULEE" }).eq("id", invoiceId);
  if (error) {
    console.error("[cancelPendingInvoiceAction] Échec de l'annulation :", error.message);
    return { error: "Impossible d'annuler la facture" };
  }

  revalidatePath("/abonnement");
  return { success: "Facture annulée" };
}
