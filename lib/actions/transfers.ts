"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { logAction } from "@/lib/audit";
import { adjustStock } from "@/lib/stock";

export type TransferItemInput = {
  productId: string;
  quantity: number;
};

export type CreateTransferInput = {
  fromLocationId: string;
  toLocationId: string;
  items: TransferItemInput[];
  note?: string;
};

export type CreateTransferResult =
  | { success: true; transferId: string }
  | { success: false; error: string };

async function nextTransferNumber(businessId: string) {
  const business = await prisma.business.update({
    where: { id: businessId },
    data: { nextTransferSeq: { increment: 1 } },
    select: { nextTransferSeq: true },
  });
  return `ZND-T-${String(business.nextTransferSeq - 1).padStart(6, "0")}`;
}

export async function createTransferAction(input: CreateTransferInput): Promise<CreateTransferResult> {
  const user = await requirePermission(PERMISSIONS.TRANSFERS_MANAGE);

  if (!input.fromLocationId || !input.toLocationId) {
    return { success: false, error: "Sélectionnez les boutiques de départ et d'arrivée" };
  }
  if (input.fromLocationId === input.toLocationId) {
    return { success: false, error: "La boutique de départ et d'arrivée doivent être différentes" };
  }
  if (!input.items || input.items.length === 0) {
    return { success: false, error: "Ajoutez au moins un produit à transférer" };
  }
  for (const item of input.items) {
    if (item.quantity <= 0) return { success: false, error: "Quantité invalide" };
  }

  const [fromLocation, toLocation] = await Promise.all([
    prisma.location.findFirst({ where: { id: input.fromLocationId, businessId: user.businessId } }),
    prisma.location.findFirst({ where: { id: input.toLocationId, businessId: user.businessId } }),
  ]);
  if (!fromLocation) return { success: false, error: "Boutique de départ introuvable" };
  if (!toLocation) return { success: false, error: "Boutique d'arrivée introuvable" };

  const productIds = input.items.map((i) => i.productId);
  const [products, stocks] = await Promise.all([
    prisma.product.findMany({ where: { id: { in: productIds }, businessId: user.businessId } }),
    prisma.productStock.findMany({ where: { productId: { in: productIds }, locationId: input.fromLocationId } }),
  ]);
  const productMap = new Map(products.map((p) => [p.id, p]));
  const stockMap = new Map(stocks.map((s) => [s.productId, s.quantity]));

  for (const item of input.items) {
    const product = productMap.get(item.productId);
    if (!product) return { success: false, error: "Un produit est introuvable" };
    const available = stockMap.get(item.productId) ?? 0;
    if (available < item.quantity) {
      return {
        success: false,
        error: `Stock insuffisant pour "${product.name}" à ${fromLocation.name} (disponible : ${available})`,
      };
    }
  }

  const number = await nextTransferNumber(user.businessId);

  const transferId = await prisma.$transaction(async (tx) => {
    const transfer = await tx.stockTransfer.create({
      data: {
        businessId: user.businessId,
        number,
        fromLocationId: input.fromLocationId,
        toLocationId: input.toLocationId,
        userId: user.id,
        note: input.note,
        items: {
          create: input.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        },
      },
    });

    for (const item of input.items) {
      const out = await adjustStock(tx, {
        productId: item.productId,
        locationId: input.fromLocationId,
        delta: -item.quantity,
      });
      await tx.stockMovement.create({
        data: {
          businessId: user.businessId,
          locationId: input.fromLocationId,
          productId: item.productId,
          direction: "OUT",
          reason: "TRANSFERT",
          quantity: item.quantity,
          oldStock: out.oldStock,
          newStock: out.newStock,
          userId: user.id,
          note: `Transfert ${number} vers ${toLocation.name}`,
        },
      });

      const in_ = await adjustStock(tx, {
        productId: item.productId,
        locationId: input.toLocationId,
        delta: item.quantity,
      });
      await tx.stockMovement.create({
        data: {
          businessId: user.businessId,
          locationId: input.toLocationId,
          productId: item.productId,
          direction: "IN",
          reason: "TRANSFERT",
          quantity: item.quantity,
          oldStock: in_.oldStock,
          newStock: in_.newStock,
          userId: user.id,
          note: `Transfert ${number} depuis ${fromLocation.name}`,
        },
      });
    }

    return transfer.id;
  });

  await logAction({
    businessId: user.businessId,
    userId: user.id,
    action: "CREATE",
    entity: "StockTransfer",
    entityId: transferId,
    details: `${fromLocation.name} → ${toLocation.name}`,
  });

  revalidatePath("/transferts");
  revalidatePath("/produits");
  revalidatePath("/stock");
  revalidatePath("/dashboard");

  return { success: true, transferId };
}
