"use server";

import { supabase } from "@/lib/supabase";
import { getSaspayCheckoutStatus } from "@/lib/saspay";
import { activateInvoicePayment } from "@/lib/subscription-fulfillment";
import { revalidatePath } from "next/cache";

export interface AdminSaspayPayment {
  id: string;
  businessId: string;
  businessName: string;
  businessPhone: string | null;
  businessEmail: string | null;
  purpose: string;
  targetId: string;
  saspayId: string;
  amount: number;
  status: "PENDING" | "PAID" | "FAILED";
  paymentMethod: string | null;
  createdAt: string;
  paidAt: string | null;
}

/** Récupère tous les paiements SasPay avec les coordonnées du commerçant */
export async function getAdminSaspayPayments(): Promise<AdminSaspayPayment[]> {
  try {
    const { data, error } = await supabase
      .from("saspay_payments")
      .select(`
        id,
        business_id,
        purpose,
        target_id,
        saspay_id,
        amount,
        status,
        payment_method,
        created_at,
        paid_at,
        businesses (
          id,
          name,
          phone,
          email
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[admin-saspay] Erreur lecture paiements :", error.message);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      businessId: row.business_id,
      businessName: row.businesses?.name || "Commerce sans nom",
      businessPhone: row.businesses?.phone || null,
      businessEmail: row.businesses?.email || null,
      purpose: row.purpose,
      targetId: row.target_id,
      saspayId: row.saspay_id,
      amount: Number(row.amount || 0),
      status: row.status,
      paymentMethod: row.payment_method || "SasPay (Orange / Moov / Carte)",
      createdAt: row.created_at,
      paidAt: row.paid_at,
    }));
  } catch (e) {
    console.error("[admin-saspay] Exception getAdminSaspayPayments :", e);
    return [];
  }
}

/** Validation manuelle par le créateur ZINDO (active l'abonnement du commerçant) */
export async function manuallyValidateSaspayPaymentAction(params: {
  paymentId: string;
  paymentMethod?: string;
  note?: string;
}): Promise<{ success?: boolean; error?: string }> {
  try {
    const { data: payment, error: pError } = await supabase
      .from("saspay_payments")
      .select("id, purpose, target_id, saspay_id, status")
      .eq("id", params.paymentId)
      .maybeSingle();

    if (pError || !payment) return { error: "Paiement introuvable." };
    if (payment.status === "PAID") return { error: "Ce paiement est déjà validé." };

    const now = new Date().toISOString();
    const chosenMethod = params.paymentMethod || "VALIDATION_MANUELLE";

    // 1. Mettre à jour le paiement SasPay dans ZINDO
    const { error: uError } = await supabase
      .from("saspay_payments")
      .update({
        status: "PAID",
        paid_at: now,
        payment_method: chosenMethod,
      })
      .eq("id", payment.id);

    if (uError) return { error: "Impossible de mettre à jour le statut." };

    // 2. Si c'est un abonnement, activer directement la facture
    if (payment.purpose === "ABONNEMENT" && payment.target_id) {
      let result = await activateInvoicePayment({
        invoiceId: payment.target_id,
        method: "SASPAY",
        reference: `admin-valid:${payment.saspay_id}`,
      });

      if ("error" in result) {
        // Repli si l'enum SASPAY n'est pas encore présent
        result = await activateInvoicePayment({
          invoiceId: payment.target_id,
          method: "MANUEL",
          reference: `admin-valid:${payment.saspay_id}`,
        });
      }

      if ("error" in result) {
        console.error("[admin-saspay] Erreur activation abonnement :", result.error);
        return { error: `Statut payé, mais erreur d'activation de la facture : ${result.error}` };
      }
    }

    revalidatePath("/admin/saspay");
    return { success: true };
  } catch (e: any) {
    return { error: e?.message || "Erreur lors de la validation manuelle." };
  }
}

/** Vérification directe en direct auprès de SasPay */
export async function syncSaspayPaymentAction(
  paymentId: string
): Promise<{ success?: boolean; status?: string; error?: string }> {
  try {
    const { data: payment } = await supabase
      .from("saspay_payments")
      .select("id, purpose, target_id, saspay_id")
      .eq("id", paymentId)
      .maybeSingle();

    if (!payment) return { error: "Paiement introuvable." };

    const status = await getSaspayCheckoutStatus(payment.saspay_id);

    if (status.paid) {
      await supabase
        .from("saspay_payments")
        .update({ status: "PAID", paid_at: new Date().toISOString() })
        .eq("id", payment.id);

      if (payment.purpose === "ABONNEMENT" && payment.target_id) {
        await activateInvoicePayment({
          invoiceId: payment.target_id,
          method: "SASPAY",
          reference: payment.saspay_id,
        });
      }

      revalidatePath("/admin/saspay");
      return { success: true, status: "PAID" };
    }

    revalidatePath("/admin/saspay");
    return { success: true, status: status.status };
  } catch (e: any) {
    return { error: e?.message || "Vérification SasPay impossible." };
  }
}
