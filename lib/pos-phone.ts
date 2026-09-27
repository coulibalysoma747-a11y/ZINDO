import "server-only";
import { isFeatureEnabled, registerFeatureFlag } from "@/lib/feature-flags";

const POS_PHONE_FLAG = "caisse_telephone";

/**
 * Flag caisse_telephone : caisse et facture A4 façon FasoStock sur téléphone —
 * plein écran (sans en-tête, bandeau ni barre du bas de l'application),
 * barre fixe en haut (← retour, menu ⋮ : session, réglages, fermer, quitter),
 * pastilles de catégories, barre « Panier — Voir / Payer » en bas, remontée
 * dans l'application installée (sur Tecno, le bas y passe sous la barre du
 * téléphone). Ordinateur inchangé.
 */
export async function isPosPhoneEnabled(businessId: string): Promise<boolean> {
  await registerFeatureFlag(
    POS_PHONE_FLAG,
    "Caisse plein écran sur téléphone",
    "Téléphone : caisse et facture A4 en plein écran, barre fixe en haut avec ← retour et menu ⋮ (session, réglages, fermer la caisse, quitter), pastilles de catégories au-dessus des produits, barre « Panier — Voir / Payer » en bas. Ordinateur inchangé."
  );
  return isFeatureEnabled(POS_PHONE_FLAG, businessId);
}
