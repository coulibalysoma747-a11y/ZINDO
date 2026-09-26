import "server-only";
import { supabase } from "@/lib/supabase";
import { cache } from "react";

export type BusinessSettings = {
  /** "Toute vente au nom d'un client" — un client devient obligatoire sur chaque vente. */
  requireCustomerOnSale: boolean;
  /** "Refuser la vente si le client a une dette" — bloque l'encaissement tant que le solde n'est pas soldé. */
  blockSaleIfCustomerDebt: boolean;
  /** "Montrer mes chiffres de vente à mes employés" — sinon le classement des vendeurs reste réservé à l'administrateur. */
  showSalesLeaderboardToEmployees: boolean;
  /** "Suivre les marchandises à retirer" — permet de marquer une vente payée mais pas encore emportée. */
  trackUnclaimedGoods: boolean;
  /** "Afficher le détail des encaissements" — volet repliable sous les chiffres du tableau de bord. */
  dashboardShowPaymentBreakdown: boolean;
  /** "Personnaliser mes dépenses" — catégories proposées à la saisie d'une dépense. */
  expenseCategories: string[];
  /** "Prix du conditionnement à la pièce" — la saisie demande le prix d'une pièce du lot plutôt que le prix du lot entier (stocké tel quel en base dans les deux cas). */
  packagingUnitPriceMode: "lot" | "piece";
  /** "Remplir le stock en un clic" — cases à cocher + quantité groupée sur /stock/remplissage. */
  bulkStockFillEnabled: boolean;
  /** "Masquer le client en caisse rapide" — le sélecteur de client disparaît de la caisse (sauf vente à crédit, où il reste requis). */
  hideCustomerInPos: boolean;
  /** "Imprimer en A4 ou en thermique au choix" — un bouton propose l'autre format d'impression sur chaque vente, sans rien dupliquer en base. */
  dualFormatPrintingEnabled: boolean;
  /** "Champ de saisie pour la quantité" (input) vs "Boutons (-) et (+)" (buttons) — "both" = comportement actuel (les deux affichés), les deux autres n'affichent que l'un ou l'autre. */
  posQuantityInputMode: "both" | "input" | "buttons";
  /** "Opérateurs mobile money proposés" — décochez ceux que vous n'encaissez pas ; un seul coché = choisi automatiquement à la vente. */
  mobileMoneyOperators: ("ORANGE" | "MOOV" | "WAVE")[];
  /** "Autoriser le paiement mixte (espèces + mobile money)" — ajoute un moyen de paiement MIXTE qui répartit le total entre les deux. */
  allowMixedPayment: boolean;
  /** "Panier IA" — lit une commande dictée/tapée/photographiée en caisse pour proposer les lignes de panier, à confirmer avant tout ajout réel. Coûte un appel IA par analyse : désactivé par défaut. */
  aiCartEnabled: boolean;
  /** "Avez-vous une boutique/local physique ?" — répond au bandeau affiché à l'administrateur tant que la question n'a pas été posée. `null` = jamais répondu (déclenche le bandeau), distinct d'une réponse explicite `false`. */
  hasPhysicalStore: boolean | null;
  /** Modules que le commerçant peut masquer/afficher lui-même dans son propre menu (voir lib/nav.ts `moduleToggle`). */
  modulesEnabled: {
    devis: boolean;
    prixDeRevient: boolean;
    photosProduits: boolean;
    rappelsCredit: boolean;
    reassort: boolean;
    notifications: boolean;
    /** "Approvisionnement rapide" — page dédiée pour faire entrer du stock sans fournisseur ni bon de commande. */
    quickSupply: boolean;
    /** "Enlèvements partenaires" — inverse de l'approvisionnement : un confrère vient prendre de la marchandise. */
    pickups: boolean;
    /** "Expéditions" — suivi des colis envoyés par transporteur pour la vente en gros à distance. */
    shipments: boolean;
    /** "Caisse à deux" — ajoute la page /caisse (permission CASHIER_QUEUE_MANAGE) : un vendeur envoie un panier à la file d'attente sans encaisser, un caissier le récupère et finalise le paiement. Le stock n'est déduit qu'au paiement. Désactivé par défaut. */
    cashierQueue: boolean;
  };
  /** Modèle visuel de la Facture A4 (voir lib/invoice-templates.ts) — derrière le flag "facture_multi_templates", voir components/sales/InvoiceTemplatePanel.tsx. */
  invoiceTemplate: string;
  /** Modèle visuel des devis — null = même modèle que les factures (comportement historique). */
  quoteTemplate: string | null;
};

// Comportement par défaut si la colonne n'est pas encore migrée ou vide :
// exactement le comportement actuel de ZINDO (aucune nouvelle contrainte),
// sauf showSalesLeaderboardToEmployees qui reprend le défaut FasoStock
// (déjà coché) puisque le classement est déjà visible de tous chez ZINDO.
const DEFAULTS: BusinessSettings = {
  requireCustomerOnSale: false,
  blockSaleIfCustomerDebt: false,
  showSalesLeaderboardToEmployees: true,
  trackUnclaimedGoods: true,
  dashboardShowPaymentBreakdown: true,
  expenseCategories: ["Loyer", "Marketing", "Télécom", "Carburant", "Salaires", "Électricité/eau", "Transport", "Autre"],
  packagingUnitPriceMode: "lot",
  bulkStockFillEnabled: true,
  hideCustomerInPos: false,
  dualFormatPrintingEnabled: true,
  posQuantityInputMode: "both",
  mobileMoneyOperators: ["ORANGE", "MOOV", "WAVE"],
  allowMixedPayment: false,
  aiCartEnabled: false,
  hasPhysicalStore: null,
  modulesEnabled: {
    devis: true,
    prixDeRevient: true,
    photosProduits: true,
    rappelsCredit: true,
    reassort: true,
    notifications: true,
    quickSupply: true,
    pickups: true,
    shipments: true,
    cashierQueue: false,
  },
  invoiceTemplate: "classique",
  quoteTemplate: null,
};

export type BusinessSettingsPatch = Partial<Omit<BusinessSettings, "modulesEnabled">> & {
  modulesEnabled?: Partial<BusinessSettings["modulesEnabled"]>;
};

function merge(base: BusinessSettings, patch: BusinessSettingsPatch): BusinessSettings {
  return {
    ...base,
    ...patch,
    // Fusion en profondeur uniquement pour ce sous-objet imbriqué — sans ça,
    // activer/désactiver UN module effacerait le réglage des autres.
    modulesEnabled: { ...base.modulesEnabled, ...(patch.modulesEnabled ?? {}) },
  };
}

async function getBusinessSettingsUncached(businessId: string): Promise<BusinessSettings> {
  const { data } = await supabase.from("businesses").select("settings").eq("id", businessId).maybeSingle();
  const raw = data?.settings as string | null | undefined;
  if (!raw) return DEFAULTS;
  try {
    return merge(DEFAULTS, JSON.parse(raw));
  } catch {
    return DEFAULTS;
  }
}

export async function updateBusinessSettings(businessId: string, patch: BusinessSettingsPatch) {
  const current = await getBusinessSettings(businessId);
  const next = merge(current, patch);
  const { error } = await supabase.from("businesses").update({ settings: JSON.stringify(next) }).eq("id", businessId);
  return { error, settings: next };
}

/** Mémorisé le temps d'une requête : le layout et la page l'appellent tous les deux. */
export const getBusinessSettings = cache(getBusinessSettingsUncached);
