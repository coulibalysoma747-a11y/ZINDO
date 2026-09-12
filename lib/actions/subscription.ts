"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
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

  const plan = await prisma.subscriptionPlan.findUnique({ where: { key: parsed.data.planKey } });
  if (!plan) return { success: false, error: "Palier introuvable" };

  const amount = billingCycle === "ANNUAL" ? plan.annualPrice : plan.monthlyPrice;

  if (amount === 0) {
    // Palier gratuit : pas de facture, on rattache directement le commerce.
    await prisma.businessSubscription.upsert({
      where: { businessId: user.businessId },
      update: { planId: plan.id, billingCycle, status: "ACTIVE", currentPeriodEnd: null },
      create: { businessId: user.businessId, planId: plan.id, billingCycle, status: "ACTIVE" },
    });
    revalidatePath("/abonnement");
    return { success: true, invoiceId: "" };
  }

  const number = await generateSubscriptionInvoiceNumber(user.businessId);
  const invoice = await prisma.subscriptionInvoice.create({
    data: {
      businessId: user.businessId,
      number,
      planKey: plan.key,
      planLabel: plan.label,
      billingCycle,
      amount,
    },
  });

  await logAction({
    businessId: user.businessId,
    userId: user.id,
    action: "CREATE",
    entity: "SubscriptionInvoice",
    entityId: invoice.id,
    details: `${plan.label} (${billingCycle})`,
  });

  let paymentUrl: string | undefined;
  if (isCinetPayConfigured()) {
    const headerList = await headers();
    const host = headerList.get("host") ?? "localhost:3000";
    const protocol = host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";
    const result = await initiateCinetPayPayment({
      invoiceId: invoice.id,
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
  return { success: true, invoiceId: invoice.id, paymentUrl };
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

  const invoice = await prisma.subscriptionInvoice.findFirst({
    where: { id: parsed.data.invoiceId, businessId: user.businessId },
  });
  if (!invoice) return { error: "Facture introuvable" };
  if (invoice.status !== "EN_ATTENTE") return { error: "Cette facture a déjà été traitée" };

  await prisma.subscriptionInvoice.update({
    where: { id: invoice.id },
    data: { paymentMethod: "MANUEL", paymentReference: parsed.data.reference, proofNote: parsed.data.note },
  });

  await logAction({
    businessId: user.businessId,
    userId: user.id,
    action: "UPDATE",
    entity: "SubscriptionInvoice",
    entityId: invoice.id,
    details: "Référence de paiement soumise",
  });

  revalidatePath("/abonnement");
  return { success: "Référence envoyée — un administrateur va confirmer votre paiement sous peu." };
}
