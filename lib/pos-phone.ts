import "server-only";
import { isFeatureEnabled, registerFeatureFlag } from "@/lib/feature-flags";

const POS_PHONE_FLAG = "caisse_telephone";

/**
 * Flag caisse_telephone : caisse et facture A4 façon FasoStock sur téléphone —
 * plein écran (sans en-tête, bandeau ni barre du bas), barre fixe en haut
 * (← retour, bouton panier, menu ⋮ : session, réglages, fermer, quitter),
 * pastilles de catégories. Ordinateur inchangé. Pas de barre en bas : sur
 * certains téléphones (Tecno), le bas de l'écran est recouvert.
 */
export async function isPosPhoneEnabled(businessId: string): Promise<boolean> {
  await registerFeatureFlag(
    POS_PHONE_FLAG,
    "Caisse plein écran sur téléphone",
    "Téléphone : caisse et facture A4 en plein écran, barre fixe en haut avec ← retour, bouton panier (nombre et total) et menu ⋮ (session, réglages, fermer la caisse, quitter), pastilles de catégories au-dessus des produits. Ordinateur inchangé."
  );
  return isFeatureEnabled(POS_PHONE_FLAG, businessId);
}
