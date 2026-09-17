import "server-only";
import { supabase } from "@/lib/supabase";

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
  /** Modules que le commerçant peut masquer/afficher lui-même dans son propre menu (voir lib/nav.ts `moduleToggle`). */
  modulesEnabled: {
    devis: boolean;
    prixDeRevient: boolean;
    photosProduits: boolean;
    rappelsCredit: boolean;
    reassort: boolean;
    notifications: boolean;
  };
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
  modulesEnabled: {
    devis: true,
    prixDeRevient: true,
    photosProduits: true,
    rappelsCredit: true,
    reassort: true,
    notifications: true,
  },
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

export async function getBusinessSettings(businessId: string): Promise<BusinessSettings> {
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
