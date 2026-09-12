"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { logAction } from "@/lib/audit";
import { generatePurchaseNumber } from "@/lib/reference";
import { adjustStock } from "@/lib/stock";

export type PurchaseItemInput = {
  productId: string;
  quantity: number;
  unitPrice: number;
};

export type CreatePurchaseInput = {
  supplierId: string;
  locationId: string;
  items: PurchaseItemInput[];
  amountPaid: number;
  note?: string;
};

export type CreatePurchaseResult =
  | { success: true; purchaseId: string }
  | { success: false; error: string };

export async function createPurchaseAction(input: CreatePurchaseInput): Promise<CreatePurchaseResult> {
  const user = await requirePermission(PERMISSIONS.PURCHASES_MANAGE);

  if (!input.supplierId) return { success: false, error: "Sélectionnez un fournisseur" };
  if (!input.locationId) return { success: false, error: "Sélectionnez la boutique de destination" };
  if (!input.items || input.items.length === 0) return { success: false, error: "Ajoutez au moins un produit" };
  for (const item of input.items) {
    if (item.quantity <= 0) return { success: false, error: "Quantité invalide" };
    if (item.unitPrice < 0) return { success: false, error: "Prix invalide" };
  }

  const [supplier, location] = await Promise.all([
    prisma.supplier.findFirst({ where: { id: input.supplierId, businessId: user.businessId } }),
    prisma.location.findFirst({ where: { id: input.locationId, businessId: user.businessId } }),
  ]);
  if (!supplier) return { success: false, error: "Fournisseur introuvable" };
  if (!location) return { success: false, error: "Boutique introuvable" };

  const productIds = input.items.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, businessId: user.businessId },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));
  for (const item of input.items) {
    if (!productMap.has(item.productId)) return { success: false, error: "Un produit est introuvable" };
  }

  const total = input.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const amountPaid = Math.max(0, Math.min(input.amountPaid, total));
  const status = amountPaid >= total ? "RECUE" : amountPaid > 0 ? "PARTIELLE" : "COMMANDEE";
  const number = await generatePurchaseNumber(user.businessId);

  const purchaseId = await prisma.$transaction(async (tx) => {
    const purchase = await tx.purchase.create({
      data: {
        businessId: user.businessId,
        locationId: input.locationId,
        number,
        supplierId: input.supplierId,
        userId: user.id,
        total,
        amountPaid,
        status,
        note: input.note,
        items: {
          create: input.items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            total: i.quantity * i.unitPrice,
          })),
        },
      },
    });

    for (const item of input.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { purchasePrice: item.unitPrice },
      });

      const { oldStock, newStock } = await adjustStock(tx, {
        productId: item.productId,
        locationId: input.locationId,
        delta: item.quantity,
      });

      await tx.stockMovement.create({
        data: {
          businessId: user.businessId,
          locationId: input.locationId,
          productId: item.productId,
          direction: "IN",
          reason: "ACHAT",
          quantity: item.quantity,
          oldStock,
          newStock,
          userId: user.id,
          note: `Achat ${number}`,
        },
      });
    }

    if (amountPaid > 0) {
      await tx.supplierPayment.create({
        data: {
          supplierId: input.supplierId,
          purchaseId: purchase.id,
          amount: amountPaid,
          method: "ESPECES",
          userId: user.id,
        },
      });
    }

    return purchase.id;
  });

  await logAction({
    businessId: user.businessId,
    userId: user.id,
    action: "CREATE",
    entity: "Purchase",
    entityId: purchaseId,
    details: `Total ${total}`,
  });

  revalidatePath("/achats");
  revalidatePath("/produits");
  revalidatePath(`/fournisseurs/${input.supplierId}`);
  revalidatePath("/dashboard");

  return { success: true, purchaseId };
}
