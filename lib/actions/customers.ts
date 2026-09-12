"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { logAction } from "@/lib/audit";

export type ActionState = { error?: string; success?: string } | undefined;

const customerSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  phone: z.string().optional(),
  email: z.string().email("E-mail invalide").optional().or(z.literal("")),
  address: z.string().optional(),
  creditLimit: z.coerce.number().min(0).default(0),
});

function parse(formData: FormData) {
  return customerSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone") || undefined,
    email: formData.get("email") || "",
    address: formData.get("address") || undefined,
    creditLimit: formData.get("creditLimit") || 0,
  });
}

export async function createCustomerAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requirePermission(PERMISSIONS.CUSTOMERS_MANAGE);
  const parsed = parse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const customer = await prisma.customer.create({
    data: { businessId: user.businessId, ...parsed.data, email: parsed.data.email || undefined },
  });
  await logAction({
    businessId: user.businessId,
    userId: user.id,
    action: "CREATE",
    entity: "Customer",
    entityId: customer.id,
  });

  revalidatePath("/clients");
  return { success: "Client créé" };
}

export async function updateCustomerAction(
  id: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requirePermission(PERMISSIONS.CUSTOMERS_MANAGE);
  const parsed = parse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const customer = await prisma.customer.findFirst({ where: { id, businessId: user.businessId } });
  if (!customer) return { error: "Client introuvable" };

  await prisma.customer.update({
    where: { id },
    data: { ...parsed.data, email: parsed.data.email || undefined },
  });

  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
  return { success: "Client mis à jour" };
}

export async function deleteCustomerAction(id: string) {
  const user = await requirePermission(PERMISSIONS.CUSTOMERS_MANAGE);
  const customer = await prisma.customer.findFirst({ where: { id, businessId: user.businessId } });
  if (!customer) return { error: "Client introuvable" };

  const saleCount = await prisma.sale.count({ where: { customerId: id } });
  if (saleCount > 0) {
    return { error: "Impossible de supprimer : ce client a des ventes enregistrées" };
  }

  await prisma.customer.delete({ where: { id } });
  revalidatePath("/clients");
  return { success: "Client supprimé" };
}

export async function recordCustomerPaymentAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requirePermission(PERMISSIONS.CUSTOMERS_MANAGE);
  const customerId = String(formData.get("customerId"));
  const amount = Number(formData.get("amount"));
  const method = String(formData.get("method") || "ESPECES") as
    | "ESPECES"
    | "MOBILE_MONEY"
    | "CARTE"
    | "CREDIT"
    | "AUTRE";
  const note = String(formData.get("note") || "") || undefined;

  if (!amount || amount <= 0) return { error: "Montant invalide" };

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, businessId: user.businessId },
  });
  if (!customer) return { error: "Client introuvable" };

  await prisma.customerPayment.create({
    data: { customerId, amount, method, note, userId: user.id },
  });
  await logAction({
    businessId: user.businessId,
    userId: user.id,
    action: "PAYMENT",
    entity: "Customer",
    entityId: customerId,
    details: `Remboursement de ${amount}`,
  });

  revalidatePath(`/clients/${customerId}`);
  revalidatePath("/credits");
  return { success: "Paiement enregistré" };
}
