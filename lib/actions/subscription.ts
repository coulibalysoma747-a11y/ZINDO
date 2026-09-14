"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { supabase } from "@/lib/supabase";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { logAction } from "@/lib/audit";
import { generateSubscriptionInvoiceNumber } from "@/lib/reference";
import { initiateCinetPayPayment, isCinetPayConfigured } from "@/lib/cinetpay";

export type ActionState = { error?: string; success?: string } | undefined;

const requestSchema = z.object({
  planKey: z.string().min(1),
  billingCycle: z.enum(["MONTHLY", "ANNUAL"]),
});

export type RequestPlanChangeResult =
  | { success: true; invoiceId: string; paymentUrl?: string }
  | { success: false; error: string };

export async function requestPlanChangeAction(
  planKey: string,
  billingCycle: "MONTHLY" | "ANNUAL"
): Promise<RequestPlanChangeResult> {
  const user = await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  const parsed = requestSchema.safeParse({ planKey, billingCycle });
  if (!parsed.success) return { success: false, error: "Choix de palier invalide" };

  const { data: plan } = await supabase
    .from("subscription_plans")
    .select("id, key, label, monthlyPrice:monthly_price, annualPrice:annual_price")
    .eq("key", parsed.data.planKey)
    .maybeSingle();
  if (!plan) return { success: false, error: "Palier introuvable" };

  const amount = (billingCycle === "ANNUAL" ? plan.annualPrice : plan.monthlyPrice) as number;

  if (amount === 0) {
    // Palier gratuit : pas de facture, on rattache directement le commerce.
    const { error } = await supabase.from("business_subscriptions").upsert(
      {
        business_id: user.businessId,
        plan_id: plan.id,
        billing_cycle: billingCycle,
        status: "ACTIVE",
        current_period_end: null,
      },
      { onConflict: "business_id", ignoreDuplicates: false }
    );
    if (error) {
      console.error("[requestPlanChangeAction] Échec du rattachement au palier gratuit :", error.message);
      return { success: false, error: "Impossible de changer de palier" };
    }
    revalidatePath("/abonnement");
    return { success: true, invoiceId: "" };
  }

  const number = await generateSubscriptionInvoiceNumber(user.businessId);
  const { data: invoice, error: invoiceError } = await supabase
    .from("subscription_invoices")
    .insert({
      business_id: user.businessId,
      number,
      plan_key: plan.key,
      plan_label: plan.label,
      billing_cycle: billingCycle,
      amount,
    })
    .select("id")
    .single();
  if (invoiceError || !invoice) {
    console.error("[requestPlanChangeAction] Échec de la création de la facture :", invoiceError?.message);
    return { success: false, error: "Impossible de créer la facture" };
  }

  await logAction({
    businessId: user.businessId,
    userId: user.id,
    action: "CREATE",
    entity: "SubscriptionInvoice",
    entityId: invoice.id as string,
    details: `${plan.label} (${billingCycle})`,
  });

  let paymentUrl: string | undefined;
  if (isCinetPayConfigured()) {
    const headerList = await headers();
    const host = headerList.get("host") ?? "localhost:3000";
    const protocol = host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";
    const result = await initiateCinetPayPayment({
      invoiceId: invoice.id as string,
      amount,
      description: `Abonnement ${plan.label} (${billingCycle === "ANNUAL" ? "annuel" : "mensuel"})`,
      customerName: `${user.firstName} ${user.lastName}`,
      customerPhone: user.phone,
      returnUrl: `${protocol}://${host}/abonnement`,
      notifyUrl: `${protocol}://${host}/api/cinetpay/webhook`,
    });
    if ("paymentUrl" in result) paymentUrl = result.paymentUrl;
  }

  revalidatePath("/abonnement");
  return { success: true, invoiceId: invoice.id as string, paymentUrl };
}

const proofSchema = z.object({
  invoiceId: z.string().min(1),
  reference: z.string().min(2, "Indiquez la référence du paiement"),
  note: z.string().optional(),
});

export async function submitPaymentProofAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
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
