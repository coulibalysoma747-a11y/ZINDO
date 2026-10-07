import "server-only";
import { supabase } from "@/lib/supabase";
import { createSaspayCheckout, getSaspayCheckoutStatus } from "@/lib/saspay";
import { activateInvoicePayment } from "@/lib/subscription-fulfillment";
import { isFeatureEnabled, registerFeatureFlag } from "@/lib/feature-flags";
import { PACK_PRICE, extendPack } from "@/lib/market-pack";

export const SASPAY_FLAG = "paiement_saspay";
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.zindo.site";
const FAILED_STATUSES = new Set(["FAILED", "CANCELLED", "CANCELED", "EXPIRED"]);

/** Bouton « Payer avec SasPay » : seulement si la clé est configurée ET l'interrupteur activé (désactivé par défaut). */
export async function isSaspayPaymentEnabled(businessId: string): Promise<boolean> {
  if (!process.env.SASPAY_SECRET_KEY) return false;
  await registerFeatureFlag(SASPAY_FLAG, "Paiement par SasPay", "Paiement en ligne par SasPay : facture d'abonnement, recharge du portefeuille du Marché et Pack Vérifié.");
  return isFeatureEnabled(SASPAY_FLAG, businessId);
}

type Customer = { name: string; email: string | null; phone: string | null };

/** Crée la session de paiement chez SasPay, la mémorise (en attente) et renvoie l'adresse où envoyer le client. */
async function startSaspayPayment(params: {
  businessId: string;
  purpose: "ABONNEMENT" | "RECHARGE" | "PACK";
  targetId: string;
  amount: number;
  description: string;
  returnPath: string;
  customer: Customer;
  fallbackEmailPrefix: string;
}): Promise<{ url: string } | { error: string }> {
  let checkout;
  try {
    checkout = await createSaspayCheckout({
      amount: params.amount,
      currency: "XOF",
      customerName: params.customer.name,
      customerEmail: params.customer.email || `${params.fallbackEmailPrefix}-${params.businessId.slice(0, 8)}@zindo.site`,
      customerPhone: params.customer.phone ?? undefined,
      description: params.description,
      returnUrl: `${SITE_URL}${params.returnPath}`,
      metadata: { purpose: params.purpose, targetId: params.targetId },
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Le paiement n'a pas pu être créé." };
  }
  if (!checkout.checkoutUrl) return { error: "SasPay n'a pas renvoyé de page de paiement. Réessayez." };

  const { error } = await supabase
    .from("saspay_payments")
    .insert({ business_id: params.businessId, purpose: params.purpose, target_id: params.targetId, saspay_id: checkout.id, amount: params.amount });
  if (error) {
    console.error("[saspay] Enregistrement du paiement impossible :", error.message);
    return { error: "Impossible d'enregistrer le paiement" };
  }
  return { url: checkout.checkoutUrl };
}

/** Crée le paiement SasPay d'une facture d'abonnement en attente et renvoie l'adresse où envoyer le client. */
export async function startSaspayInvoicePayment(params: {
  businessId: string;
  invoiceId: string;
  customer: Customer;
}): Promise<{ url: string } | { error: string }> {
  const { data: invoice } = await supabase
    .from("subscription_invoices")
    .select("id, number, planLabel:plan_label, amount, status")
    .eq("id", params.invoiceId)
    .eq("business_id", params.businessId)
    .maybeSingle();
  if (!invoice) return { error: "Facture introuvable" };
  if (invoice.status !== "EN_ATTENTE") return { error: "Cette facture n'est plus en attente de paiement" };

  return startSaspayPayment({
    businessId: params.businessId,
    purpose: "ABONNEMENT",
    targetId: invoice.id as string,
    amount: Number(invoice.amount),
    description: `Abonnement ZINDO — ${invoice.planLabel} (${invoice.number})`,
    returnPath: "/abonnement",
    customer: params.customer,
    fallbackEmailPrefix: "abonne",
  });
}

/** Crée le paiement SasPay d'une recharge du portefeuille du Marché ; le solde est crédité à la confirmation. */
export async function startSaspayTopupPayment(params: {
  businessId: string;
  amount: number;
  customer: Customer;
}): Promise<{ url: string } | { error: string }> {
  return startSaspayPayment({
    businessId: params.businessId,
    purpose: "RECHARGE",
    targetId: params.businessId,
    amount: params.amount,
    description: "Recharge du portefeuille ZINDO Marché",
    returnPath: "/mon-marche/visibilite",
    customer: params.customer,
    fallbackEmailPrefix: "marche",
  });
}

/** Crée le paiement SasPay du Pack Vérifié (1 mois) ; à la confirmation, un pack déjà vérifié est prolongé tout seul. */
export async function startSaspayPackPayment(params: { businessId: string; customer: Customer }): Promise<{ url: string } | { error: string }> {
  return startSaspayPayment({
    businessId: params.businessId,
    purpose: "PACK",
    targetId: params.businessId,
    amount: PACK_PRICE,
    description: "Pack Vérifié ZINDO Marché (1 mois)",
    returnPath: "/verification",
    customer: params.customer,
    fallbackEmailPrefix: "pack",
  });
}

/**
 * Applique un paiement de Pack Vérifié confirmé. Commerce déjà vérifié : le pack est prolongé de 30 jours et le paiement
 * marqué « utilisé ». Sinon (première demande) le paiement reste disponible : la demande de vérification le consommera.
 */
async function applySaspayPackPayment(params: { paymentId: string; businessId: string; saspayId: string }): Promise<boolean> {
  const { data: row, error } = await supabase
    .from("market_verifications")
    .select("status, packPaidUntil:pack_paid_until")
    .eq("business_id", params.businessId)
    .maybeSingle();
  if (error) {
    console.error("[saspay] Pack Vérifié illisible :", error.message);
    return false;
  }
  if (row?.status !== "VALIDEE") return true;

  const { error: updateError } = await supabase
    .from("market_verifications")
    .update({ pack_paid_until: extendPack((row.packPaidUntil as string | null) ?? null), payment_reference: `saspay:${params.saspayId}` })
    .eq("business_id", params.businessId);
  if (updateError) {
    console.error("[saspay] Pack reçu mais prolongation impossible :", params.saspayId, updateError.message);
    return false;
  }
  await supabase.from("saspay_payments").update({ used_at: new Date().toISOString() }).eq("id", params.paymentId);
  return true;
}

/**
 * Crédite le portefeuille pour un paiement SasPay confirmé. La recharge est enregistrée avec la référence `saspay:<id>`
 * (unique) puis validée par la fonction de la base : rejouable sans double crédit.
 */
async function creditSaspayTopup(params: { businessId: string; amount: number; saspayId: string }): Promise<boolean> {
  const reference = `saspay:${params.saspayId}`;
  let topupId: string | null = null;

  const inserted = await supabase
    .from("market_topups")
    .insert({ business_id: params.businessId, amount: Math.round(params.amount), operator: "SASPAY", reference })
    .select("id")
    .single();
  if (inserted.data) {
    topupId = inserted.data.id as string;
  } else if (inserted.error?.code === "23505") {
    // Déjà enregistrée par une tentative précédente : on la retrouve (déjà validée, ou à valider).
    const { data: existing } = await supabase.from("market_topups").select("id, status").eq("reference", reference).maybeSingle();
    if (existing?.status === "VALIDEE") return true;
    topupId = (existing?.id as string | undefined) ?? null;
  } else {
    console.error("[saspay] Recharge impossible à enregistrer :", inserted.error?.message);
  }
  if (!topupId) return false;

  const { error } = await supabase.rpc("market_validate_topup", { p_topup_id: topupId, p_admin: "SASPAY" });
  if (error && !error.message.includes("RECHARGE_DEJA_TRAITEE")) {
    console.error("[saspay] Recharge reçue mais crédit impossible :", params.saspayId, error.message);
    return false;
  }
  return true;
}

/**
 * Relit chez SasPay chaque paiement en attente (les siens, ou tous si `businessId` est omis) et active ce qui est payé.
 * Seule la relecture du statut décide : jamais le contenu d'une confirmation reçue. Idempotent et sans double activation.
 */
export async function reconcileSaspayPayments(businessId?: string): Promise<number> {
  let query = supabase
    .from("saspay_payments")
    .select("id, purpose, businessId:business_id, targetId:target_id, saspayId:saspay_id, amount")
    .eq("status", "PENDING")
    .order("created_at", { ascending: false })
    .limit(50);
  if (businessId) query = query.eq("business_id", businessId);
  const { data } = await query;
  let confirmed = 0;

  for (const p of (data ?? []) as { id: string; purpose: string; businessId: string; targetId: string; saspayId: string; amount: number }[]) {
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
      } else if (p.purpose === "PACK") {
        if (!(await applySaspayPackPayment({ paymentId: p.id, businessId: p.businessId, saspayId: p.saspayId }))) {
          await supabase.from("saspay_payments").update({ status: "PENDING", paid_at: null }).eq("id", p.id);
          continue;
        }
      } else if (p.purpose === "RECHARGE") {
        if (!(await creditSaspayTopup({ businessId: p.businessId, amount: p.amount, saspayId: p.saspayId }))) {
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
