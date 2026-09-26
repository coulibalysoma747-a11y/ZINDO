"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { requireSuperAdmin } from "@/lib/superadmin-auth";
import { logAdminAction } from "@/lib/admin-audit";
import { activateInvoicePayment } from "@/lib/subscription-fulfillment";
import { FEATURE_CATALOG } from "@/lib/subscription";
import { MAX_TRIAL_DAYS } from "@/lib/platform-config";

export type ActionState = { error?: string; success?: string } | undefined;

const payerSchema = z.object({
  lastName: z.string().trim().min(1, "Nom du payeur requis").max(80),
  firstName: z.string().trim().min(1, "Prénom du payeur requis").max(80),
  phone: z.string().trim().min(8, "Numéro du payeur requis").max(20),
});

export async function confirmInvoicePaymentAction(
  invoiceId: string,
  payer: { lastName: string; firstName: string; phone: string }
) {
  const admin = await requireSuperAdmin();
  const parsed = payerSchema.safeParse(payer);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const result = await activateInvoicePayment({ invoiceId, method: "MANUEL" });
  if ("error" in result) return { error: result.error };

  await supabase
    .from("subscription_invoices")
    .update({ payer_last_name: parsed.data.lastName, payer_first_name: parsed.data.firstName, payer_phone: parsed.data.phone })
    .eq("id", invoiceId);

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
  const { data: invoice } = await supabase.from("subscription_invoices").select("id, status").eq("id", invoiceId).maybeSingle();
  if (!invoice) return { error: "Facture introuvable" };
  if (invoice.status !== "EN_ATTENTE") return { error: "Seule une facture en attente peut être annulée" };

  const { error } = await supabase.from("subscription_invoices").update({ status: "ANNULEE" }).eq("id", invoiceId);
  if (error) {
    console.error("[cancelInvoiceAction] Échec de l'annulation :", error.message);
    return { error: "Impossible d'annuler la facture" };
  }
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

/** Prolonge manuellement l'essai gratuit d'un commerce (support client). */
export async function updateTrialDaysAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireSuperAdmin();
  const days = Number(formData.get("trialDays"));
  if (!Number.isInteger(days) || days < 1 || days > MAX_TRIAL_DAYS) {
    return { error: `Indiquez un nombre de jours entre 1 et ${MAX_TRIAL_DAYS}` };
  }

  const { error } = await supabase
    .from("platform_config")
    .update({ trial_days: days, updated_at: new Date().toISOString() })
    .eq("id", 1);
  if (error) {
    console.error("[updateTrialDaysAction] Échec de l'enregistrement :", error.message);
    return { error: "Impossible d'enregistrer : la migration de la base n'est peut-être pas encore appliquée" };
  }

  await logAdminAction({
    superAdminId: admin.id,
    actorName: admin.name,
    action: "UPDATE",
    entity: "PlatformConfig",
    details: `Durée de l'essai gratuit : ${days} jour(s)`,
  });

  revalidatePath("/admin/abonnements");
  revalidatePath("/tarifs");
  revalidatePath("/cgu");
  revalidatePath("/en/cgu");
  revalidatePath("/fonctionnalites/[slug]", "page");
  return { success: `Les nouveaux commerces auront ${days} jour(s) d'essai gratuit` };
}

export async function extendTrialAction(businessId: string, days: number) {
  const admin = await requireSuperAdmin();
  const { data: sub } = await supabase
    .from("business_subscriptions")
    .select("id, trialEndsAt:trial_ends_at")
    .eq("business_id", businessId)
    .maybeSingle();
  if (!sub) return { error: "Commerce sans abonnement" };

  const base = sub.trialEndsAt && new Date(sub.trialEndsAt as string) > new Date() ? new Date(sub.trialEndsAt as string) : new Date();
  const newTrialEndsAt = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);

  const { error } = await supabase
    .from("business_subscriptions")
    .update({ status: "TRIAL", trial_ends_at: newTrialEndsAt.toISOString() })
    .eq("business_id", businessId);
  if (error) {
    console.error("[extendTrialAction] Échec de la prolongation :", error.message);
    return { error: "Impossible de prolonger l'essai" };
  }

  await logAdminAction({
    superAdminId: admin.id,
    actorName: admin.name,
    action: "UPDATE",
    entity: "BusinessSubscription",
    entityId: businessId,
    details: `Essai prolongé de ${days} jour(s)`,
  });

  revalidatePath("/admin/abonnements");
  return { success: `Essai prolongé jusqu'au ${newTrialEndsAt.toLocaleDateString("fr-FR")}` };
}

export async function assignBusinessPlanAction(
  businessId: string,
  planKey: string,
  billingCycle: "MONTHLY" | "ANNUAL"
) {
  const admin = await requireSuperAdmin();
  const { data: plan } = await supabase.from("subscription_plans").select("id, label").eq("key", planKey).maybeSingle();
  if (!plan) return { error: "Palier introuvable" };

  const { error } = await supabase.from("business_subscriptions").upsert(
    { business_id: businessId, plan_id: plan.id, billing_cycle: billingCycle, status: "ACTIVE" },
    { onConflict: "business_id", ignoreDuplicates: false }
  );
  if (error) {
    console.error("[assignBusinessPlanAction] Échec de la mise à jour :", error.message);
    return { error: "Impossible de mettre à jour l'abonnement" };
  }

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

  const { data: plan, error } = await supabase
    .from("subscription_plans")
    .update({
      label: parsed.data.label,
      monthly_price: parsed.data.monthlyPrice,
      annual_price: parsed.data.annualPrice,
      max_products: parsed.data.maxProducts ?? null,
      max_users: parsed.data.maxUsers ?? null,
      max_locations: parsed.data.maxLocations ?? null,
      features: JSON.stringify(features),
      updated_at: new Date().toISOString(),
    })
    .eq("id", planId)
    .select("label")
    .single();
  if (error || !plan) {
    console.error("[updateSubscriptionPlanAction] Échec de la mise à jour :", error?.message);
    return { error: "Impossible de mettre à jour le palier" };
  }

  await logAdminAction({
    superAdminId: admin.id,
    actorName: admin.name,
    action: "UPDATE",
    entity: "SubscriptionPlan",
    entityId: planId,
    details: plan.label as string,
  });

  revalidatePath("/admin/abonnements");
  revalidatePath("/admin/abonnements/plans");
  return { success: "Palier mis à jour" };
}
