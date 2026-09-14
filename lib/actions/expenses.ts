"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { getCurrentLocation } from "@/lib/location";
import { logAction } from "@/lib/audit";

export type ActionState = { error?: string; success?: string } | undefined;

const expenseSchema = z.object({
  label: z.string().min(1, "Le libellé est requis"),
  amount: z.coerce.number().positive("Le montant doit être supérieur à 0"),
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
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const currentLocation = await getCurrentLocation(user.businessId);
  if (!currentLocation) return { error: "Configurez d'abord une boutique" };

  const { data: expense, error } = await supabase
    .from("expenses")
    .insert({
      business_id: user.businessId,
      location_id: currentLocation.id,
      label: parsed.data.label,
      amount: parsed.data.amount,
      note: parsed.data.note ?? null,
      user_id: user.id,
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
