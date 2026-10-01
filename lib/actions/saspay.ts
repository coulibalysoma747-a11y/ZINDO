"use server";

import { requireUserForBilling } from "@/lib/auth";
import { isSaspayPaymentEnabled, startSaspayInvoicePayment } from "@/lib/saspay-payments";

/** « Payer avec SasPay » sur la facture d'abonnement en attente : renvoie la page de paiement où envoyer le client. */
export async function payInvoiceWithSaspayAction(invoiceId: string): Promise<{ error?: string; url?: string }> {
  const user = await requireUserForBilling();
  if (!(await isSaspayPaymentEnabled(user.businessId))) return { error: "Le paiement en ligne n'est pas encore disponible." };
  const result = await startSaspayInvoicePayment({
    businessId: user.businessId,
    invoiceId,
    customer: { name: `${user.firstName} ${user.lastName}`.trim(), email: user.email ?? null, phone: user.phone ?? null },
  });
  return "error" in result ? { error: result.error } : { url: result.url };
}
