"use server";

import { registerFeatureFlag, isFeatureEnabled } from "@/lib/feature-flags";
import { BROWSER_OFFLINE_FLAG } from "@/lib/nav";

/**
 * Mode hors ligne du navigateur et du téléphone : le service worker
 * (public/sw.js) garde une copie des pages essentielles pour qu'elles
 * s'ouvrent sans Internet ; les écritures passent ensuite par la file
 * d'attente déjà existante (lib/offline/db.ts, lib/offline/sync.ts).
 * Nouvelle fonctionnalité, désactivée par défaut : à activer depuis
 * /admin/fonctionnalites, globalement ou commerce par commerce.
 */
export async function ensureBrowserOfflineFlagRegistered() {
  await registerFeatureFlag(
    BROWSER_OFFLINE_FLAG,
    "Mode hors ligne (téléphone et navigateur)",
    "Garde une copie des pages essentielles (vente, caisse, produits, stock, clients, fournisseurs, achats, inventaire) pour pouvoir ouvrir ZINDO et vendre sans Internet, sur téléphone comme sur ordinateur — synchronisation automatique au retour de la connexion."
  );
}

export async function isBrowserOfflineEnabled(businessId: string): Promise<boolean> {
  await ensureBrowserOfflineFlagRegistered();
  return isFeatureEnabled(BROWSER_OFFLINE_FLAG, businessId);
}
