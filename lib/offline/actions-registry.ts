"use client";

import { createSaleAction } from "@/lib/actions/sales";
import { createStockMovementJsonAction, type CreateStockMovementInput } from "@/lib/actions/stock";
import { createCustomerJsonAction } from "@/lib/actions/customers";
import { createSupplierJsonAction } from "@/lib/actions/suppliers";
import { createPurchaseAction } from "@/lib/actions/purchases";
import { createInventoryAction } from "@/lib/actions/inventory";
import { createProductJsonAction } from "@/lib/actions/products";
import type { PendingWriteKind } from "@/lib/offline/db";

export type ReplayResult = { success: true; id: string } | { success: false; error: string };

type ReplayFn = (input: unknown) => Promise<ReplayResult>;

/**
 * Associe chaque `PendingWriteKind` à l'action serveur JSON qui rejoue cette
 * écriture à la reconnexion. Chaque action ci-dessous accepte une `clientRef`
 * dans son `input` et dédoublonne dessus côté serveur (même garantie
 * d'idempotence que createSaleAction/createSaleImpl) — voir
 * lib/actions/sales.ts:164-175 pour le modèle.
 */
const registry: Partial<Record<PendingWriteKind, ReplayFn>> = {
  sale: async (input) => {
    const result = await createSaleAction(input as Parameters<typeof createSaleAction>[0]);
    return result.success ? { success: true, id: result.saleId } : { success: false, error: result.error };
  },
  stockMovement: async (input) => {
    const { direction, ...rest } = input as CreateStockMovementInput & { direction: "IN" | "OUT" };
    const result = await createStockMovementJsonAction(direction, rest);
    return result.success ? { success: true, id: result.movementId } : { success: false, error: result.error };
  },
  customer: async (input) => {
    const result = await createCustomerJsonAction(input as Parameters<typeof createCustomerJsonAction>[0]);
    return result.success ? { success: true, id: result.customerId } : { success: false, error: result.error };
  },
  supplier: async (input) => {
    const result = await createSupplierJsonAction(input as Parameters<typeof createSupplierJsonAction>[0]);
    return result.success ? { success: true, id: result.supplierId } : { success: false, error: result.error };
  },
  purchase: async (input) => {
    const result = await createPurchaseAction(input as Parameters<typeof createPurchaseAction>[0]);
    return result.success ? { success: true, id: result.purchaseId } : { success: false, error: result.error };
  },
  inventory: async (input) => {
    const result = await createInventoryAction(input as Parameters<typeof createInventoryAction>[0]);
    return result.success ? { success: true, id: result.inventoryId } : { success: false, error: result.error };
  },
  product: async (input) => {
    const result = await createProductJsonAction(input as Parameters<typeof createProductJsonAction>[0]);
    return result.success ? { success: true, id: result.productId } : { success: false, error: result.error };
  },
};

export function getReplayAction(kind: PendingWriteKind): ReplayFn | null {
  return registry[kind] ?? null;
}
