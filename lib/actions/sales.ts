"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission, requireUser } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { logAction } from "@/lib/audit";
import { generateSaleNumber } from "@/lib/reference";
import { adjustStock } from "@/lib/stock";
import type { PaymentMethod } from "@prisma/client";

export type CartItemInput = {
  productId: string;
  quantity: number;
  unitPrice: number;
  discount: number;
};

export type CreateSaleInput = {
  locationId: string;
  items: CartItemInput[];
  customerId?: string;
  discount: number;
  paymentMethod: PaymentMethod;
  amountPaid: number;
  note?: string;
  documentType?: "TICKET" | "FACTURE";
};

export type CreateSaleResult = { success: true; saleId: string } | { success: false; error: string };

export async function createSaleAction(input: CreateSaleInput): Promise<CreateSaleResult> {
  const user = await requirePermission(PERMISSIONS.SALES_CREATE);

  if (!input.locationId) return { success: false, error: "Boutique introuvable" };
  if (!input.items || input.items.length === 0) {
    return { success: false, error: "Le panier est vide" };
  }

  const location = await prisma.location.findFirst({
    where: { id: input.locationId, businessId: user.businessId },
  });
  if (!location) return { success: false, error: "Boutique introuvable" };

  const activeSession = await prisma.cashSession.findFirst({
    where: { businessId: user.businessId, locationId: input.locationId, status: "OUVERTE" },
  });
  if (!activeSession) {
    return { success: false, error: "Ouvrez une session de caisse avant d'encaisser une vente" };
  }

  const productIds = input.items.map((i) => i.productId);
  const [products, stocks] = await Promise.all([
    prisma.product.findMany({ where: { id: { in: productIds }, businessId: user.businessId } }),
    prisma.productStock.findMany({ where: { productId: { in: productIds }, locationId: input.locationId } }),
  ]);
  const productMap = new Map(products.map((p) => [p.id, p]));
  const stockMap = new Map(stocks.map((s) => [s.productId, s.quantity]));

  for (const item of input.items) {
    const product = productMap.get(item.productId);
    if (!product) return { success: false, error: "Un produit du panier est introuvable" };
    if (item.quantity <= 0) return { success: false, error: "Quantité invalide" };
    const available = stockMap.get(item.productId) ?? 0;
    if (available < item.quantity) {
      return {
        success: false,
        error: `Stock insuffisant pour "${product.name}" à ${location.name} (disponible : ${available})`,
      };
    }
  }

  const subtotal = input.items.reduce(
    (sum, i) => sum + i.unitPrice * i.quantity - i.discount,
    0
  );
  const total = Math.max(0, subtotal - input.discount);
  const amountPaid = Math.max(0, input.amountPaid);

  if (amountPaid < total && !input.customerId) {
    return { success: false, error: "Sélectionnez un client pour une vente à crédit ou partielle" };
  }

  const status = amountPaid >= total ? "PAYEE" : amountPaid > 0 ? "PARTIELLE" : "CREDIT";

  const number = await generateSaleNumber(user.businessId);

  const saleId = await prisma.$transaction(async (tx) => {
    const sale = await tx.sale.create({
      data: {
        businessId: user.businessId,
        locationId: input.locationId,
        number,
        customerId: input.customerId || null,
        userId: user.id,
        subtotal,
        discount: input.discount,
        total,
        amountPaid,
        paymentMethod: input.paymentMethod,
        status,
        documentType: input.documentType ?? "TICKET",
        note: input.note,
        items: {
          create: input.items.map((i) => {
            const product = productMap.get(i.productId)!;
            return {
              productId: i.productId,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              unitCost: product.purchasePrice,
              discount: i.discount,
              total: i.unitPrice * i.quantity - i.discount,
            };
          }),
        },
      },
    });

    for (const item of input.items) {
      const { oldStock, newStock } = await adjustStock(tx, {
        productId: item.productId,
        locationId: input.locationId,
        delta: -item.quantity,
      });
      await tx.stockMovement.create({
        data: {
          businessId: user.businessId,
          locationId: input.locationId,
          productId: item.productId,
          direction: "OUT",
          reason: "VENTE",
          quantity: item.quantity,
          oldStock,
          newStock,
          userId: user.id,
          note: `Vente ${number}`,
        },
      });
    }

    return sale.id;
  });

  await logAction({
    businessId: user.businessId,
    userId: user.id,
    action: "CREATE",
    entity: "Sale",
    entityId: saleId,
    details: `Total ${total}`,
  });

  revalidatePath("/ventes");
  revalidatePath("/ventes/historique");
  revalidatePath("/produits");
  revalidatePath("/dashboard");
  if (input.customerId) revalidatePath(`/clients/${input.customerId}`);

  return { success: true, saleId };
}

export type UpdateSaleInput = {
  saleId: string;
  items: CartItemInput[];
  customerId?: string;
  discount: number;
  paymentMethod: PaymentMethod;
  amountPaid: number;
  note?: string;
};

export async function updateSaleAction(input: UpdateSaleInput): Promise<CreateSaleResult> {
  const user = await requirePermission(PERMISSIONS.SALES_CREATE);

  const sale = await prisma.sale.findFirst({
    where: { id: input.saleId, businessId: user.businessId },
    include: { items: true },
  });
  if (!sale) return { success: false, error: "Vente introuvable" };
  if (sale.status === "ANNULEE") {
    return { success: false, error: "Impossible de modifier une vente annulée" };
  }
  if (!input.items || input.items.length === 0) {
    return { success: false, error: "Le panier est vide" };
  }

  const oldQtyMap = new Map(sale.items.map((i) => [i.productId, i.quantity]));
  const productIds = Array.from(new Set([...oldQtyMap.keys(), ...input.items.map((i) => i.productId)]));

  const [products, stocks] = await Promise.all([
    prisma.product.findMany({ where: { id: { in: productIds }, businessId: user.businessId } }),
    prisma.productStock.findMany({ where: { productId: { in: productIds }, locationId: sale.locationId } }),
  ]);
  const productMap = new Map(products.map((p) => [p.id, p]));
  const currentStockMap = new Map(stocks.map((s) => [s.productId, s.quantity]));

  for (const item of input.items) {
    const product = productMap.get(item.productId);
    if (!product) return { success: false, error: "Un produit du panier est introuvable" };
    if (item.quantity <= 0) return { success: false, error: "Quantité invalide" };
    // Le stock déjà réservé par l'ancienne version de cette vente reste disponible pour la nouvelle.
    const available = (currentStockMap.get(item.productId) ?? 0) + (oldQtyMap.get(item.productId) ?? 0);
    if (available < item.quantity) {
      return {
        success: false,
        error: `Stock insuffisant pour "${product.name}" (disponible : ${available})`,
      };
    }
  }

  const subtotal = input.items.reduce((sum, i) => sum + i.unitPrice * i.quantity - i.discount, 0);
  const total = Math.max(0, subtotal - input.discount);
  const amountPaid = Math.max(0, input.amountPaid);

  if (amountPaid < total && !input.customerId) {
    return { success: false, error: "Sélectionnez un client pour une vente à crédit ou partielle" };
  }

  const status = amountPaid >= total ? "PAYEE" : amountPaid > 0 ? "PARTIELLE" : "CREDIT";

  await prisma.$transaction(async (tx) => {
    const newQtyMap = new Map(input.items.map((i) => [i.productId, i.quantity]));
    for (const productId of productIds) {
      const oldQty = oldQtyMap.get(productId) ?? 0;
      const newQty = newQtyMap.get(productId) ?? 0;
      const delta = oldQty - newQty;
      if (delta === 0) continue;
      const { oldStock, newStock } = await adjustStock(tx, {
        productId,
        locationId: sale.locationId,
        delta,
      });
      await tx.stockMovement.create({
        data: {
          businessId: user.businessId,
          locationId: sale.locationId,
          productId,
          direction: delta > 0 ? "IN" : "OUT",
          reason: "CORRECTION",
          quantity: Math.abs(delta),
          oldStock,
          newStock,
          userId: user.id,
          note: `Modification vente ${sale.number}`,
        },
      });
    }

    await tx.saleItem.deleteMany({ where: { saleId: sale.id } });
    await tx.sale.update({
      where: { id: sale.id },
      data: {
        customerId: input.customerId || null,
        subtotal,
        discount: input.discount,
        total,
        amountPaid,
        paymentMethod: input.paymentMethod,
        status,
        note: input.note,
        items: {
          create: input.items.map((i) => {
            const product = productMap.get(i.productId)!;
            return {
              productId: i.productId,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              unitCost: product.purchasePrice,
              discount: i.discount,
              total: i.unitPrice * i.quantity - i.discount,
            };
          }),
        },
      },
    });
  });

  await logAction({
    businessId: user.businessId,
    userId: user.id,
    action: "UPDATE",
    entity: "Sale",
    entityId: sale.id,
    details: `Total ${total}`,
  });

  revalidatePath("/ventes/historique");
  revalidatePath(`/ventes/${sale.id}`);
  revalidatePath("/produits");
  revalidatePath("/dashboard");
  if (sale.customerId) revalidatePath(`/clients/${sale.customerId}`);
  if (input.customerId && input.customerId !== sale.customerId) revalidatePath(`/clients/${input.customerId}`);

  return { success: true, saleId: sale.id };
}

export async function cancelSaleAction(saleId: string) {
  const user = await requirePermission(PERMISSIONS.SALES_VIEW);

  const sale = await prisma.sale.findFirst({
    where: { id: saleId, businessId: user.businessId },
    include: { items: true },
  });
  if (!sale) return { error: "Vente introuvable" };
  if (sale.status === "ANNULEE") return { error: "Cette vente est déjà annulée" };

  await prisma.$transaction(async (tx) => {
    for (const item of sale.items) {
      const { oldStock, newStock } = await adjustStock(tx, {
        productId: item.productId,
        locationId: sale.locationId,
        delta: item.quantity,
      });
      await tx.stockMovement.create({
        data: {
          businessId: user.businessId,
          locationId: sale.locationId,
          productId: item.productId,
          direction: "IN",
          reason: "RETOUR_CLIENT",
          quantity: item.quantity,
          oldStock,
          newStock,
          userId: user.id,
          note: `Annulation vente ${sale.number}`,
        },
      });
    }
    await tx.sale.update({ where: { id: sale.id }, data: { status: "ANNULEE" } });
  });

  await logAction({
    businessId: user.businessId,
    userId: user.id,
    action: "CANCEL",
    entity: "Sale",
    entityId: sale.id,
  });

  revalidatePath("/ventes/historique");
  revalidatePath(`/ventes/${sale.id}`);
  revalidatePath("/produits");
  return { success: "Vente annulée, stock réintégré" };
}

export async function getEnabledPaymentMethods() {
  const user = await requireUser();
  const methods = await prisma.paymentMethodConfig.findMany({
    where: { businessId: user.businessId, enabled: true },
  });

  const canonicalOrder: PaymentMethod[] = ["ESPECES", "MOBILE_MONEY", "CARTE", "CREDIT", "AUTRE"];
  const byCanonicalOrder = (a: { method: PaymentMethod }, b: { method: PaymentMethod }) =>
    canonicalOrder.indexOf(a.method) - canonicalOrder.indexOf(b.method);

  if (methods.length === 0) {
    return [
      { method: "ESPECES" as PaymentMethod, label: "Espèces" },
      { method: "MOBILE_MONEY" as PaymentMethod, label: "Mobile Money" },
      { method: "CARTE" as PaymentMethod, label: "Carte bancaire" },
      { method: "CREDIT" as PaymentMethod, label: "Crédit" },
    ].sort(byCanonicalOrder);
  }
  return methods.sort(byCanonicalOrder);
}
