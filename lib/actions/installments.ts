"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { logAction } from "@/lib/audit";

export type Installment = {
  id: string;
  seq: number;
  dueDate: string;
  amount: number;
  paidAmount: number;
  paidAt: string | null;
};

export type InstallmentPlan = {
  id: string;
  saleId: string;
  customerId: string;
  downPayment: number;
  installments: Installment[];
};

/** Échéancier existant pour une vente, s'il y en a un. */
export async function getInstallmentPlanAction(saleId: string): Promise<InstallmentPlan | null> {
  const user = await requirePermission(PERMISSIONS.SALES_VIEW);

  const { data: plan } = await supabase
    .from("installment_plans")
    .select("id, saleId:sale_id, customerId:customer_id, downPayment:down_payment")
    .eq("business_id", user.businessId)
    .eq("sale_id", saleId)
    .maybeSingle();
  if (!plan) return null;

  const { data: installments } = await supabase
    .from("installments")
    .select("id, seq, dueDate:due_date, amount, paidAmount:paid_amount, paidAt:paid_at")
    .eq("plan_id", plan.id)
    .order("seq", { ascending: true });

  return { ...(plan as unknown as Omit<InstallmentPlan, "installments">), installments: (installments ?? []) as unknown as Installment[] };
}

const installmentInputSchema = z.object({
  dueDate: z.string().min(1),
  amount: z.coerce.number().positive(),
});
const planSchema = z.array(installmentInputSchema).min(1);

export type InstallmentActionResult = { error?: string; success?: string };

/**
 * Crée l'échéancier d'une vente à crédit/partielle — acompte déjà couvert
 * par ce qui a été encaissé à la vente (sale.amount_paid), puis une ou
 * plusieurs échéances datées jusqu'au solde. La somme des échéances doit
 * correspondre exactement au reste à payer, pour ne jamais désynchroniser
 * l'échéancier du solde réel de la vente.
 */
export async function createInstallmentPlanAction(saleId: string, rows: unknown): Promise<InstallmentActionResult> {
  const user = await requirePermission(PERMISSIONS.SALES_CREATE);

  const parsed = planSchema.safeParse(rows);
  if (!parsed.success) return { error: "Ajoutez au moins une échéance valide" };

  const { data: sale } = await supabase
    .from("sales")
    .select("id, customerId:customer_id, total, amountPaid:amount_paid, status")
    .eq("id", saleId)
    .eq("business_id", user.businessId)
    .maybeSingle();
  if (!sale) return { error: "Vente introuvable" };
  if (!sale.customerId) return { error: "Cette vente n'a pas de client associé" };
  if (sale.status !== "CREDIT" && sale.status !== "PARTIELLE") {
    return { error: "Cette vente est déjà entièrement payée" };
  }

  const remaining = Math.round(((sale.total as number) - (sale.amountPaid as number)) * 100) / 100;
  const sum = Math.round(parsed.data.reduce((s, r) => s + r.amount, 0) * 100) / 100;
  if (sum !== remaining) {
    return { error: `La somme des échéances (${sum}) doit correspondre exactement au reste à payer (${remaining})` };
  }

  const { data: existing } = await supabase
    .from("installment_plans")
    .select("id")
    .eq("sale_id", saleId)
    .maybeSingle();
  if (existing) return { error: "Un échéancier existe déjà pour cette vente" };

  const { data: plan, error: planError } = await supabase
    .from("installment_plans")
    .insert({
      business_id: user.businessId,
      sale_id: saleId,
      customer_id: sale.customerId,
      down_payment: sale.amountPaid,
    })
    .select("id")
    .single();
  if (planError || !plan) {
    console.error("[createInstallmentPlanAction] Échec de la création du plan :", planError?.message);
    return { error: "Impossible de créer l'échéancier" };
  }

  const { error: installmentsError } = await supabase.from("installments").insert(
    parsed.data.map((r, i) => ({
      plan_id: plan.id,
      seq: i + 1,
      due_date: r.dueDate,
      amount: r.amount,
    }))
  );
  if (installmentsError) {
    console.error("[createInstallmentPlanAction] Échec de l'enregistrement des échéances :", installmentsError.message);
    await supabase.from("installment_plans").delete().eq("id", plan.id);
    return { error: "Impossible d'enregistrer les échéances" };
  }

  await logAction({ businessId: user.businessId, userId: user.id, action: "CREATE", entity: "InstallmentPlan", entityId: plan.id as string });
  revalidatePath(`/ventes/${saleId}`);
  return { success: "Échéancier créé" };
}

/**
 * Enregistre le paiement (total ou partiel) d'une échéance : met à jour
 * l'échéance elle-même, ajoute une ligne customer_payments (pour que
 * l'historique du client reste la source unique de vérité), et met à jour
 * le montant payé — et le statut si soldée — de la vente d'origine, pour
 * que la page Crédits (qui calcule sale.total - sale.amount_paid) reste
 * exacte.
 */
export async function payInstallmentAction(
  installmentId: string,
  amount: number,
  method: string
): Promise<InstallmentActionResult> {
  const user = await requirePermission(PERMISSIONS.SALES_CREATE);
  if (amount <= 0) return { error: "Montant invalide" };

  const { data: installment } = await supabase
    .from("installments")
    .select("id, amount, paidAmount:paid_amount, planId:plan_id")
    .eq("id", installmentId)
    .maybeSingle();
  if (!installment) return { error: "Échéance introuvable" };

  const { data: plan } = await supabase
    .from("installment_plans")
    .select("id, saleId:sale_id, customerId:customer_id")
    .eq("id", installment.planId)
    .eq("business_id", user.businessId)
    .maybeSingle();
  if (!plan) return { error: "Échéancier introuvable" };

  const { data: sale } = await supabase
    .from("sales")
    .select("id, total, amountPaid:amount_paid")
    .eq("id", plan.saleId)
    .maybeSingle();
  if (!sale) return { error: "Vente introuvable" };

  const newPaidAmount = Math.round(((installment.paidAmount as number) + amount) * 100) / 100;
  const { error: installmentError } = await supabase
    .from("installments")
    .update({
      paid_amount: newPaidAmount,
      paid_at: newPaidAmount >= (installment.amount as number) ? new Date().toISOString() : null,
    })
    .eq("id", installmentId);
  if (installmentError) {
    console.error("[payInstallmentAction] Échec de la mise à jour de l'échéance :", installmentError.message);
    return { error: "Impossible d'enregistrer ce paiement" };
  }

  await supabase.from("customer_payments").insert({
    customer_id: plan.customerId,
    sale_id: plan.saleId,
    amount,
    method,
    note: "Paiement d'échéance",
    user_id: user.id,
  });

  const newAmountPaid = Math.round(((sale.amountPaid as number) + amount) * 100) / 100;
  await supabase
    .from("sales")
    .update({
      amount_paid: newAmountPaid,
      status: newAmountPaid >= (sale.total as number) ? "PAYEE" : "PARTIELLE",
    })
    .eq("id", plan.saleId);

  revalidatePath(`/ventes/${plan.saleId}`);
  revalidatePath("/credits");
  if (plan.customerId) revalidatePath(`/clients/${plan.customerId}`);
  return { success: "Paiement enregistré" };
}

export type UpcomingInstallment = {
  id: string;
  dueDate: string;
  amount: number;
  paidAmount: number;
  saleId: string;
  saleNumber: string;
  customerId: string;
  customerName: string;
};

/** Échéances non soldées, triées par date — pour la page Crédits. */
export async function getUpcomingInstallmentsAction(): Promise<UpcomingInstallment[]> {
  const user = await requirePermission(PERMISSIONS.CUSTOMERS_VIEW);

  const { data: plans } = await supabase
    .from("installment_plans")
    .select("id, saleId:sale_id, customerId:customer_id, customer:customers(name), sale:sales(number)")
    .eq("business_id", user.businessId);
  if (!plans || plans.length === 0) return [];

  const planMap = new Map(
    (plans as unknown as Array<{ id: string; saleId: string; customerId: string; customer: { name: string } | null; sale: { number: string } | null }>).map(
      (p) => [p.id, p]
    )
  );

  const { data: installments } = await supabase
    .from("installments")
    .select("id, dueDate:due_date, amount, paidAmount:paid_amount, planId:plan_id")
    .in("plan_id", [...planMap.keys()])
    .order("due_date", { ascending: true });

  return ((installments ?? []) as unknown as Array<{ id: string; dueDate: string; amount: number; paidAmount: number; planId: string }>)
    .filter((i) => i.paidAmount < i.amount)
    .map((i) => {
      const plan = planMap.get(i.planId)!;
      return {
        id: i.id,
        dueDate: i.dueDate,
        amount: i.amount,
        paidAmount: i.paidAmount,
        saleId: plan.saleId,
        saleNumber: plan.sale?.number ?? "—",
        customerId: plan.customerId,
        customerName: plan.customer?.name ?? "—",
      };
    });
}
