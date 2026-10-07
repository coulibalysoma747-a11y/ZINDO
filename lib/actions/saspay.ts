"use server";

import { requireUser, requireUserForBilling } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { requireMarketSeller } from "@/lib/market-seller";
import { isSaspayPaymentEnabled, startSaspayInvoicePayment, startSaspayPackPayment, startSaspayTopupPayment } from "@/lib/saspay-payments";

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

/** Recharge du portefeuille du Marché par SasPay : renvoie la page de paiement ; le solde est crédité à la confirmation. */
export async function topupWithSaspayAction(amount: number): Promise<{ error?: string; url?: string }> {
  const { user } = await requireMarketSeller(PERMISSIONS.SETTINGS_MANAGE);
  if (!Number.isInteger(amount) || amount < 200) return { error: "Montant en FCFA, 200 FCFA minimum, sans centimes." };
  if (amount > 10_000_000) return { error: "Montant trop élevé." };
  if (!(await isSaspayPaymentEnabled(user.businessId))) return { error: "Le paiement en ligne n'est pas encore disponible." };
  const result = await startSaspayTopupPayment({
    businessId: user.businessId,
    amount,
    customer: { name: `${user.firstName} ${user.lastName}`.trim(), email: user.email ?? null, phone: user.phone ?? null },
  });
  return "error" in result ? { error: result.error } : { url: result.url };
}

/** Pack Vérifié (1 000 FCFA / mois) par SasPay : renvoie la page de paiement ; un pack déjà vérifié est prolongé à la confirmation. */
export async function payPackWithSaspayAction(): Promise<{ error?: string; url?: string }> {
  const user = await requireUser();
  if (user.role !== "ADMIN") return { error: "Seul le propriétaire du compte peut payer le Pack Vérifié." };
  if (!(await isSaspayPaymentEnabled(user.businessId))) return { error: "Le paiement en ligne n'est pas encore disponible." };
  const result = await startSaspayPackPayment({
    businessId: user.businessId,
    customer: { name: `${user.firstName} ${user.lastName}`.trim(), email: user.email ?? null, phone: user.phone ?? null },
  });
  return "error" in result ? { error: result.error } : { url: result.url };
}
