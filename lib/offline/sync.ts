"use client";

import { createSaleAction } from "@/lib/actions/sales";
import { getPendingSales, removePendingSale, markPendingSaleError, type PendingSale } from "@/lib/offline/db";

export type SyncOutcome = { synced: number; failed: number; failedSales: PendingSale[] };

/**
 * Rejoue les ventes enregistrées hors ligne vers le serveur, une par une
 * (pas en parallèle : plus simple à suivre, et le volume reste faible en
 * pratique). Chaque vente porte sa clientRef d'origine — createSaleAction
 * est idempotent dessus, donc rejouer une synchro interrompue ne duplique
 * jamais une vente déjà passée.
 */
export async function syncPendingSales(): Promise<SyncOutcome> {
  const pending = await getPendingSales();
  let synced = 0;
  const failedSales: PendingSale[] = [];

  for (const sale of pending) {
    try {
      const result = await createSaleAction(sale.input);
      if (result.success) {
        await removePendingSale(sale.clientRef);
        synced++;
      } else {
        await markPendingSaleError(sale.clientRef, result.error);
        failedSales.push({ ...sale, syncStatus: "error", syncError: result.error });
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Erreur réseau — nouvelle tentative au prochain retour de connexion.";
      await markPendingSaleError(sale.clientRef, message);
      failedSales.push({ ...sale, syncStatus: "error", syncError: message });
    }
  }

  return { synced, failed: failedSales.length, failedSales };
}
