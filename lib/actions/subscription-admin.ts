"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/superadmin-auth";
import { logAdminAction } from "@/lib/admin-audit";
import { activateInvoicePayment } from "@/lib/subscription-fulfillment";
import { FEATURE_CATALOG } from "@/lib/subscription";

export type ActionState = { error?: string; success?: string } | undefined;

export async function confirmInvoicePaymentAction(invoiceId: string) {
  const admin = await requireSuperAdmin();
  const result = await activateInvoicePayment({ invoiceId, method: "MANUEL" });
  if ("error" in result) return { error: result.error };

  await logAdminAction({
    superAdminId: admin.id,
    actorName: admin.name,
    action: "UPDATE",
    entity: "SubscriptionInvoice",
    entityId: invoiceId,
    details: "Paiement confirmé manuellement",
  });

  revalidatePath("/admin/abonnements");
  return { success: "Paiement confirmé — l'abonnement est actif" };
}

export async function cancelInvoiceAction(invoiceId: string) {
  const admin = await requireSuperAdmin();
  const invoice = await prisma.subscriptionInvoice.findUnique({ where: { id: invoiceId } });
  if (!invoice) return { error: "Facture introuvable" };
  if (invoice.status !== "EN_ATTENTE") return { error: "Seule une facture en attente peut être annulée" };

  await prisma.subscriptionInvoice.update({ where: { id: invoiceId }, data: { status: "ANNULEE" } });
  await logAdminAction({
    superAdminId: admin.id,
    actorName: admin.name,
    action: "UPDATE",
    entity: "SubscriptionInvoice",
    entityId: invoiceId,
    details: "Facture annulée",
  });

  revalidatePath("/admin/abonnements");
  return { success: "Facture annulée" };
}

export async function assignBusinessPlanAction(
  businessId: string,
  planKey: string,
  billingCycle: "MONTHLY" | "ANNUAL"
) {
  const admin = await requireSuperAdmin();
  const plan = await prisma.subscriptionPlan.findUnique({ where: { key: planKey } });
  if (!plan) return { error: "Palier introuvable" };

  await prisma.businessSubscription.upsert({
    where: { businessId },
    update: { planId: plan.id, billingCycle, status: "ACTIVE" },
    create: { businessId, planId: plan.id, billingCycle, status: "ACTIVE" },
  });

  await logAdminAction({
    superAdminId: admin.id,
    actorName: admin.name,
    action: "UPDATE",
    entity: "BusinessSubscription",
    entityId: businessId,
    details: `${plan.label} (${billingCycle})`,
  });

  revalidatePath("/admin/abonnements");
  revalidatePath("/admin/commercants");
  return { success: "Abonnement mis à jour" };
}

const planSchema = z.object({
  label: z.string().min(1, "Le nom est requis"),
  monthlyPrice: z.coerce.number().int().min(0),
  annualPrice: z.coerce.number().int().min(0),
  maxProducts: z.coerce.number().int().min(0).optional(),
  maxUsers: z.coerce.number().int().min(0).optional(),
  maxLocations: z.coerce.number().int().min(0).optional(),
});

export async function updateSubscriptionPlanAction(
  planId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const admin = await requireSuperAdmin();
  const parsed = planSchema.safeParse({
    label: formData.get("label"),
    monthlyPrice: formData.get("monthlyPrice"),
    annualPrice: formData.get("annualPrice"),
    maxProducts: formData.get("maxProducts") || undefined,
    maxUsers: formData.get("maxUsers") || undefined,
    maxLocations: formData.get("maxLocations") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const validKeys = new Set(FEATURE_CATALOG.map((f) => f.key));
  const features = formData.getAll("features").map(String).filter((k) => validKeys.has(k));

  const plan = await prisma.subscriptionPlan.update({
    where: { id: planId },
    data: {
      label: parsed.data.label,
      monthlyPrice: parsed.data.monthlyPrice,
      annualPrice: parsed.data.annualPrice,
      maxProducts: parsed.data.maxProducts ?? null,
      maxUsers: parsed.data.maxUsers ?? null,
      maxLocations: parsed.data.maxLocations ?? null,
      features: JSON.stringify(features),
    },
  });

  await logAdminAction({
    superAdminId: admin.id,
    actorName: admin.name,
    action: "UPDATE",
    entity: "SubscriptionPlan",
    entityId: planId,
    details: plan.label,
  });

  revalidatePath("/admin/abonnements");
  revalidatePath("/admin/abonnements/plans");
  return { success: "Palier mis à jour" };
}
