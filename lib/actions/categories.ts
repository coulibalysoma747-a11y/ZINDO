"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { logAction } from "@/lib/audit";

export type ActionState = { error?: string; success?: string } | undefined;

const categorySchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  description: z.string().optional(),
});

export async function createCategoryAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requirePermission(PERMISSIONS.CATEGORIES_MANAGE);
  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const existing = await prisma.category.findFirst({
    where: { businessId: user.businessId, name: parsed.data.name },
  });
  if (existing) return { error: "Cette catégorie existe déjà" };

  const category = await prisma.category.create({
    data: { businessId: user.businessId, ...parsed.data },
  });
  await logAction({
    businessId: user.businessId,
    userId: user.id,
    action: "CREATE",
    entity: "Category",
    entityId: category.id,
  });

  revalidatePath("/categories");
  return { success: "Catégorie créée" };
}

export async function updateCategoryAction(
  id: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requirePermission(PERMISSIONS.CATEGORIES_MANAGE);
  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const category = await prisma.category.findFirst({
    where: { id, businessId: user.businessId },
  });
  if (!category) return { error: "Catégorie introuvable" };

  await prisma.category.update({ where: { id }, data: parsed.data });
  await logAction({
    businessId: user.businessId,
    userId: user.id,
    action: "UPDATE",
    entity: "Category",
    entityId: id,
  });

  revalidatePath("/categories");
  return { success: "Catégorie mise à jour" };
}

export async function deleteCategoryAction(id: string) {
  const user = await requirePermission(PERMISSIONS.CATEGORIES_MANAGE);

  const category = await prisma.category.findFirst({
    where: { id, businessId: user.businessId },
  });
  if (!category) return { error: "Catégorie introuvable" };

  const productCount = await prisma.product.count({ where: { categoryId: id } });
  if (productCount > 0) {
    return { error: `Impossible de supprimer : ${productCount} produit(s) utilisent cette catégorie` };
  }

  await prisma.category.delete({ where: { id } });
  await logAction({
    businessId: user.businessId,
    userId: user.id,
    action: "DELETE",
    entity: "Category",
    entityId: id,
  });

  revalidatePath("/categories");
  return { success: "Catégorie supprimée" };
}
