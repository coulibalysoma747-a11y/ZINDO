import "server-only";
import { isFeatureEnabled, registerFeatureFlag } from "@/lib/feature-flags";

/**
 * Petits outils de la caisse demandés le 2026-09-26, chacun derrière son
 * propre flag (désactivé par défaut) pour être activés un par un.
 */
const POS_EXTRA_FLAGS = {
  clearCart: {
    key: "vider_panier",
    label: "Caisse : bouton « Tout effacer »",
    description: "Gros bouton rouge « Tout effacer » en haut du panier : remet le panier à zéro après une confirmation rapide.",
  },
  calculator: {
    key: "calculatrice_caisse",
    label: "Caisse : calculatrice intégrée",
    description: "Icône calculatrice à côté du total : petite calculatrice pour diviser l'addition ou faire un calcul sans quitter la caisse.",
  },
  highChangeWarning: {
    key: "alerte_rendu_eleve",
    label: "Caisse : alerte « rendu monnaie élevé »",
    description: "Si le montant reçu dépasse 5 fois le total du panier, la caisse demande de confirmer le montant avant de valider (évite 100 000 tapé au lieu de 10 000).",
  },
  paymentColors: {
    key: "couleur_mode_paiement",
    label: "Caisse : couleur du bouton selon le paiement",
    description: "Bouton de validation vert pour les espèces, bleu pour le mobile money et la carte, orange pour le crédit : moins de confusions au pointage du soir.",
  },
  reprintLast: {
    key: "reimpression_dernier_ticket",
    label: "Caisse : réimprimer le dernier ticket",
    description: "Bouton « Dernier ticket » en haut de la caisse : réaffiche et réimprime le ticket de la dernière vente sans passer par l'historique.",
  },
  packagingPicker: {
    key: "choix_conditionnement",
    label: "Caisse : choix du conditionnement au clic",
    description: "Un produit qui a des conditionnements (carton, paquet...) ouvre au clic un menu pour choisir entre l'unité et chaque conditionnement, avec leur prix.",
  },
} as const;

export type PosExtras = Record<keyof typeof POS_EXTRA_FLAGS, boolean>;

export async function getPosExtras(businessId: string): Promise<PosExtras> {
  const entries = await Promise.all(
    Object.entries(POS_EXTRA_FLAGS).map(async ([name, flag]) => {
      await registerFeatureFlag(flag.key, flag.label, flag.description);
      return [name, await isFeatureEnabled(flag.key, businessId)] as const;
    })
  );
  return Object.fromEntries(entries) as PosExtras;
}
