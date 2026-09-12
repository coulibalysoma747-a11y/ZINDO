"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { logAction } from "@/lib/audit";

export type ActionState = { error?: string; success?: string } | undefined;

const supplierSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  company: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("E-mail invalide").optional().or(z.literal("")),
  address: z.string().optional(),
  notes: z.string().optional(),
});

function parse(formData: FormData) {
  return supplierSchema.safeParse({
    name: formData.get("name"),
    company: formData.get("company") || undefined,
    phone: formData.get("phone") || undefined,
    email: formData.get("email") || "",
    address: formData.get("address") || undefined,
    notes: formData.get("notes") || undefined,
  });
}

export async function createSupplierAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requirePermission(PERMISSIONS.SUPPLIERS_MANAGE);
  const parsed = parse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const supplier = await prisma.supplier.create({
    data: { businessId: user.businessId, ...parsed.data, email: parsed.data.email || undefined },
  });
  await logAction({
    businessId: user.businessId,
    userId: user.id,
    action: "CREATE",
    entity: "Supplier",
    entityId: supplier.id,
  });

  revalidatePath("/fournisseurs");
  return { success: "Fournisseur créé" };
}

export async function updateSupplierAction(
  id: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requirePermission(PERMISSIONS.SUPPLIERS_MANAGE);
  const parsed = parse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const supplier = await prisma.supplier.findFirst({ where: { id, businessId: user.businessId } });
  if (!supplier) return { error: "Fournisseur introuvable" };

  await prisma.supplier.update({
    where: { id },
    data: { ...parsed.data, email: parsed.data.email || undefined },
  });
  await logAction({
    businessId: user.businessId,
    userId: user.id,
    action: "UPDATE",
    entity: "Supplier",
    entityId: id,
  });

  revalidatePath("/fournisseurs");
  revalidatePath(`/fournisseurs/${id}`);
  return { success: "Fournisseur mis à jour" };
}

export async function deleteSupplierAction(id: string) {
  const user = await requirePermission(PERMISSIONS.SUPPLIERS_MANAGE);
  const supplier = await prisma.supplier.findFirst({ where: { id, businessId: user.businessId } });
  if (!supplier) return { error: "Fournisseur introuvable" };

  const productCount = await prisma.product.count({ where: { supplierId: id } });
  const purchaseCount = await prisma.purchase.count({ where: { supplierId: id } });
  if (productCount > 0 || purchaseCount > 0) {
    return { error: "Impossible de supprimer : ce fournisseur est lié à des produits ou achats" };
  }

  await prisma.supplier.delete({ where: { id } });
  revalidatePath("/fournisseurs");
  return { success: "Fournisseur supprimé" };
}
