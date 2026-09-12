"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { logAction } from "@/lib/audit";
import { generateInventoryReference } from "@/lib/reference";
import { adjustStock } from "@/lib/stock";

export type CreateInventoryInput = {
  locationId: string;
  items: { productId: string; realQty: number }[];
  note?: string;
};

export type CreateInventoryResult =
  | { success: true; inventoryId: string }
  | { success: false; error: string };

export async function createInventoryAction(input: CreateInventoryInput): Promise<CreateInventoryResult> {
  const user = await requirePermission(PERMISSIONS.INVENTORY_MANAGE);

  if (!input.locationId) return { success: false, error: "Sélectionnez une boutique" };
  if (!input.items || input.items.length === 0) {
    return { success: false, error: "Sélectionnez au moins un produit à compter" };
  }

  const location = await prisma.location.findFirst({
    where: { id: input.locationId, businessId: user.businessId },
  });
  if (!location) return { success: false, error: "Boutique introuvable" };

  const productIds = input.items.map((i) => i.productId);
  const [products, stocks] = await Promise.all([
    prisma.product.findMany({ where: { id: { in: productIds }, businessId: user.businessId } }),
    prisma.productStock.findMany({ where: { productId: { in: productIds }, locationId: input.locationId } }),
  ]);
  const productIdSet = new Set(products.map((p) => p.id));
  const stockMap = new Map(stocks.map((s) => [s.productId, s.quantity]));

  const inventory = await prisma.inventory.create({
    data: {
      businessId: user.businessId,
      locationId: input.locationId,
      reference: generateInventoryReference(),
      status: "EN_COURS",
      note: input.note,
      userId: user.id,
      items: {
        create: input.items
          .filter((i) => productIdSet.has(i.productId))
          .map((i) => {
            const theoreticalQty = stockMap.get(i.productId) ?? 0;
            return {
              productId: i.productId,
              theoreticalQty,
              realQty: i.realQty,
              difference: i.realQty - theoreticalQty,
            };
          }),
      },
    },
  });

  await logAction({
    businessId: user.businessId,
    userId: user.id,
    action: "CREATE",
    entity: "Inventory",
    entityId: inventory.id,
  });

  revalidatePath("/inventaire");
  return { success: true, inventoryId: inventory.id };
}

export async function validateInventoryAction(inventoryId: string) {
  const user = await requirePermission(PERMISSIONS.INVENTORY_MANAGE);

  const inventory = await prisma.inventory.findFirst({
    where: { id: inventoryId, businessId: user.businessId },
    include: { items: true },
  });
  if (!inventory) return { error: "Inventaire introuvable" };
  if (inventory.status === "VALIDE") return { error: "Cet inventaire est déjà validé" };

  await prisma.$transaction(async (tx) => {
    for (const item of inventory.items) {
      if (item.difference === 0) continue;

      const { oldStock, newStock } = await adjustStock(tx, {
        productId: item.productId,
        locationId: inventory.locationId,
        delta: item.difference,
      });

      await tx.stockMovement.create({
        data: {
          businessId: user.businessId,
          locationId: inventory.locationId,
          productId: item.productId,
          direction: item.difference > 0 ? "IN" : "OUT",
          reason: "INVENTAIRE",
          quantity: Math.abs(item.difference),
          oldStock,
          newStock,
          userId: user.id,
          note: `Correction inventaire ${inventory.reference}`,
        },
      });
    }

    await tx.inventory.update({
      where: { id: inventory.id },
      data: { status: "VALIDE", validatedAt: new Date() },
    });
  });

  await logAction({
    businessId: user.businessId,
    userId: user.id,
    action: "VALIDATE",
    entity: "Inventory",
    entityId: inventory.id,
  });

  revalidatePath("/inventaire");
  revalidatePath(`/inventaire/${inventory.id}`);
  revalidatePath("/produits");
  return { success: "Inventaire validé, le stock a été mis à jour" };
}
