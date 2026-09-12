"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
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

  const expense = await prisma.expense.create({
    data: {
      businessId: user.businessId,
      locationId: currentLocation.id,
      label: parsed.data.label,
      amount: parsed.data.amount,
      note: parsed.data.note,
      userId: user.id,
    },
  });

  await logAction({
    businessId: user.businessId,
    userId: user.id,
    action: "CREATE",
    entity: "Expense",
    entityId: expense.id,
    details: `${parsed.data.label} — ${parsed.data.amount}`,
  });

  revalidatePath("/depenses");
  revalidatePath("/dashboard");
  return { success: "Dépense enregistrée" };
}

export async function deleteExpenseAction(id: string) {
  const user = await requirePermission(PERMISSIONS.EXPENSES_MANAGE);

  const expense = await prisma.expense.findFirst({ where: { id, businessId: user.businessId } });
  if (!expense) return { error: "Dépense introuvable" };

  await prisma.expense.delete({ where: { id } });
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
