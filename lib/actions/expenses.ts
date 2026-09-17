"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { getCurrentLocation } from "@/lib/location";
import { getBusinessSettings } from "@/lib/business-settings";
import { logAction } from "@/lib/audit";
import type { PaymentMethod } from "@/lib/db-types";

export type ActionState = { error?: string; success?: string } | undefined;

const expenseSchema = z.object({
  label: z.string().min(1, "Le libellé est requis"),
  amount: z.coerce.number().positive("Le montant doit être supérieur à 0"),
  category: z.string().optional(),
  paymentMethod: z.enum(["ESPECES", "MOBILE_MONEY", "CARTE", "CREDIT", "AUTRE"]).optional(),
  date: z.string().optional(),
  note: z.string().optional(),
});

export async function createExpenseAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requirePermission(PERMISSIONS.EXPENSES_MANAGE);
  const parsed = expenseSchema.safeParse({
    label: formData.get("label"),
    amount: formData.get("amount"),
    category: formData.get("category") || undefined,
    paymentMethod: formData.get("paymentMethod") || undefined,
    date: formData.get("date") || undefined,
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const currentLocation = await getCurrentLocation(user.businessId);
  if (!currentLocation) return { error: "Configurez d'abord une boutique" };

  const businessSettings = await getBusinessSettings(user.businessId);
  let sessionQuery = supabase
    .from("cash_sessions")
    .select("id")
    .eq("business_id", user.businessId)
    .eq("location_id", currentLocation.id)
    .eq("status", "OUVERTE");
  // "Caisse à deux" : rattache la dépense à la session de CE caissier, pour
  // qu'elle ne soit déduite que de sa propre caisse à la clôture.
  if (businessSettings.allowTwoCashiers) sessionQuery = sessionQuery.eq("user_id", user.id);
  const { data: activeSession } = await sessionQuery.maybeSingle();

  const { data: expense, error } = await supabase
    .from("expenses")
    .insert({
      business_id: user.businessId,
      location_id: currentLocation.id,
      label: parsed.data.label,
      amount: parsed.data.amount,
      category: parsed.data.category ?? null,
      payment_method: (parsed.data.paymentMethod ?? "ESPECES") as PaymentMethod,
      date: parsed.data.date ? new Date(parsed.data.date).toISOString() : new Date().toISOString(),
      note: parsed.data.note ?? null,
      user_id: user.id,
      session_id: activeSession?.id ?? null,
    })
    .select("id")
    .single();
  if (error || !expense) {
    console.error("[createExpenseAction] Échec de la création :", error?.message);
    return { error: "Impossible d'enregistrer la dépense" };
  }

  await logAction({
    businessId: user.businessId,
    userId: user.id,
    action: "CREATE",
    entity: "Expense",
    entityId: expense.id as string,
    details: `${parsed.data.label} — ${parsed.data.amount}`,
  });

  revalidatePath("/depenses");
  revalidatePath("/dashboard");
  return { success: "Dépense enregistrée" };
}

export async function deleteExpenseAction(id: string) {
  const user = await requirePermission(PERMISSIONS.EXPENSES_MANAGE);

  const { data: expense } = await supabase
    .from("expenses")
    .select("id")
    .eq("id", id)
    .eq("business_id", user.businessId)
    .maybeSingle();
  if (!expense) return { error: "Dépense introuvable" };

  const { error } = await supabase.from("expenses").delete().eq("id", id);
  if (error) {
    console.error("[deleteExpenseAction] Échec de la suppression :", error.message);
    return { error: "Impossible de supprimer la dépense" };
  }

  await logAction({
    businessId: user.businessId,
    userId: user.id,
    action: "DELETE",
    entity: "Expense",
    entityId: id,
  });

  revalidatePath("/depenses");
  revalidatePath("/dashboard");
  return { success: "Dépense supprimée" };
}
