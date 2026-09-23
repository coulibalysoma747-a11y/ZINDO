"use server";

import { registerFeatureFlag, isFeatureEnabled } from "@/lib/feature-flags";
import { DESKTOP_OFFLINE_FLAG } from "@/lib/nav";

/**
 * Mode hors ligne complet de l'application Windows (voir lib/offline/) :
 * nouvelle fonctionnalité, désactivée par défaut tant qu'elle n'est pas
 * explicitement activée depuis /admin/fonctionnalites pour un commerce donné
 * — voir la règle du memory "Feature rollout rule". Les repli hors ligne
 * propres au process desktop (cache d'authentification, cache de page
 * serveur) sont de toute façon déjà limités à l'application Electron par
 * construction (ZINDO_DESKTOP_BUILD, jamais défini sur le déploiement web) ;
 * ce flag contrôle en plus la mise en file des écritures (stock, clients,
 * fournisseurs, achats, inventaire) pour permettre un déploiement progressif
 * commerce par commerce.
 */
export async function ensureDesktopOfflineFlagRegistered() {
  await registerFeatureFlag(
    DESKTOP_OFFLINE_FLAG,
    "Mode hors ligne (application Windows)",
    "Permet de continuer à vendre, gérer le stock, les clients, les fournisseurs, les achats et l'inventaire sans connexion Internet depuis l'application Windows — synchronisation automatique au retour de la connexion."
  );
}

export async function isDesktopOfflineEnabled(businessId: string) {
  return isFeatureEnabled(DESKTOP_OFFLINE_FLAG, businessId);
}
