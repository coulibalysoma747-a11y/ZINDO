"use client";

import {
  getPendingWrites,
  removePendingWrite,
  markPendingWriteError,
  markPendingWriteBlocked,
  resolveLocalId,
  getResolvedId,
  type PendingWrite,
} from "@/lib/offline/db";
import { getReplayAction } from "@/lib/offline/actions-registry";

export type SyncOutcome = { synced: number; failed: number; blocked: number; failedWrites: PendingWrite[] };

/**
 * Rejoue les écritures enregistrées hors ligne vers le serveur, une par une
 * et dans l'ordre chronologique (pas en parallèle : le volume reste faible en
 * pratique, et l'ordre importe pour les dépendances entre écritures — ex. un
 * client créé hors ligne puis utilisé sur une vente hors ligne). Chaque
 * écriture porte sa clientRef d'origine ; les actions serveur de
 * lib/offline/actions-registry.ts dédoublonnent dessus, donc rejouer une
 * synchronisation interrompue ne duplique jamais une écriture déjà passée.
 */
let runningSync: Promise<SyncOutcome> | null = null;

export function syncPendingWrites(): Promise<SyncOutcome> {
  // Plusieurs appelants peuvent déclencher la synchro au même retour de
  // connexion (la page ouverte et components/layout/OfflineShell.tsx) : ils
  // partagent le même passage au lieu de rejouer la file deux fois.
  if (!runningSync) {
    runningSync = runSync().finally(() => {
      runningSync = null;
    });
  }
  return runningSync;
}

async function runSync(): Promise<SyncOutcome> {
  const pending = await getPendingWrites();
  let synced = 0;
  let blocked = 0;
  const failedWrites: PendingWrite[] = [];

  for (const write of pending) {
    const resolvedInput = await resolveDependencies(write);
    if (!resolvedInput) {
      await markPendingWriteBlocked(write.clientRef);
      blocked++;
      continue;
    }

    const replay = getReplayAction(write.kind);
    if (!replay) {
      // Pas encore câblé côté client (kind ajouté à Phase 5 mais UI pas
      // encore migrée) — on laisse l'écriture en file plutôt que de la perdre.
      continue;
    }

    try {
      const result = await replay(resolvedInput);
      if (result.success) {
        await resolveLocalId(write.clientRef, result.id);
        await removePendingWrite(write.clientRef);
        synced++;
      } else {
        await markPendingWriteError(write.clientRef, result.error);
        failedWrites.push({ ...write, syncStatus: "error", syncError: result.error });
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Erreur réseau — nouvelle tentative au prochain retour de connexion.";
      await markPendingWriteError(write.clientRef, message);
      failedWrites.push({ ...write, syncStatus: "error", syncError: message });
    }
  }

  return { synced, failed: failedWrites.length, blocked, failedWrites };
}

/** Réécrit les champs de `input` référençant un id local par l'id serveur résolu ; `null` si une dépendance manque encore. */
async function resolveDependencies(write: PendingWrite): Promise<unknown | null> {
  if (!write.localRefs || write.localRefs.length === 0) return write.input;
  const input = { ...(write.input as Record<string, unknown>) };
  for (const ref of write.localRefs) {
    const serverId = await getResolvedId(ref.localId);
    if (!serverId) return null;
    input[ref.field] = serverId;
  }
  return input;
}

/** @deprecated utiliser syncPendingWrites() — conservé pour l'appelant existant (app/(app)/ventes/POS.tsx). */
export async function syncPendingSales(): Promise<SyncOutcome> {
  return syncPendingWrites();
}
