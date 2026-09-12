import "server-only";
import { prisma } from "@/lib/prisma";
import type { InvoicePaymentMethod } from "@prisma/client";

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
  const invoice = await prisma.subscriptionInvoice.findUnique({ where: { id: params.invoiceId } });
  if (!invoice) return { error: "Facture introuvable" };
  if (invoice.status === "PAYEE") return { success: true, alreadyProcessed: true };
  if (invoice.status === "ANNULEE") return { error: "Cette facture a été annulée" };

  const plan = await prisma.subscriptionPlan.findUnique({ where: { key: invoice.planKey } });
  if (!plan) return { error: "Palier introuvable" };

  const now = new Date();
  const periodEnd = addPeriod(invoice.billingCycle, now);

  await prisma.$transaction([
    prisma.subscriptionInvoice.update({
      where: { id: invoice.id },
      data: {
        status: "PAYEE",
        paidAt: now,
        paymentMethod: params.method,
        paymentReference: params.reference ?? invoice.paymentReference,
      },
    }),
    prisma.businessSubscription.upsert({
      where: { businessId: invoice.businessId },
      update: {
        planId: plan.id,
        billingCycle: invoice.billingCycle,
        status: "ACTIVE",
        currentPeriodEnd: periodEnd,
      },
      create: {
        businessId: invoice.businessId,
        planId: plan.id,
        billingCycle: invoice.billingCycle,
        status: "ACTIVE",
        currentPeriodEnd: periodEnd,
      },
    }),
  ]);

  return { success: true, alreadyProcessed: false };
}
