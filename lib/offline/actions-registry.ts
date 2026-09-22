"use client";

import { createSaleAction } from "@/lib/actions/sales";
import type { PendingWriteKind } from "@/lib/offline/db";

export type ReplayResult = { success: true; id: string } | { success: false; error: string };

type ReplayFn = (input: unknown) => Promise<ReplayResult>;

/**
 * Associe chaque `PendingWriteKind` à l'action serveur JSON qui rejoue cette
 * écriture à la reconnexion. Chaque action ci-dessous accepte une `clientRef`
 * dans son `input` et dédoublonne dessus côté serveur (même garantie
 * d'idempotence que createSaleAction/createSaleImpl aujourd'hui) — voir
 * lib/actions/sales.ts:164-175 pour le modèle.
 *
 * Seul "sale" est câblé pour l'instant ; les autres kinds (stockMovement,
 * customer, supplier, purchase, inventory, product) seront ajoutés en même
 * temps que leurs actions serveur gagneront une clé d'idempotence.
 */
const registry: Partial<Record<PendingWriteKind, ReplayFn>> = {
  sale: async (input) => {
    const result = await createSaleAction(input as Parameters<typeof createSaleAction>[0]);
    return result.success ? { success: true, id: result.saleId } : { success: false, error: result.error };
  },
};

export function getReplayAction(kind: PendingWriteKind): ReplayFn | null {
  return registry[kind] ?? null;
}
