export type ActivityCategory = {
  key: string;
  label: string;
};

/** Seule activité pour laquelle le suivi individuel des engins (châssis/moteur/couleur/CMC) est proposé — voir lib/actions/vehicle-units.ts. */
export const MOTO_ACTIVITY_KEY = "boutique_moto";

export type Activity = {
  key: string;
  emoji: string;
  label: string;
  description: string;
  category: string;
};

export const ACTIVITY_CATEGORIES: ActivityCategory[] = [
  { key: "commerce_general", label: "Commerce général" },
  { key: "auto_moto", label: "Automobile & Moto" },
  { key: "restauration", label: "Restauration" },
  { key: "sante_beaute", label: "Santé & Beauté" },
  { key: "mode", label: "Mode & Habillement" },
  { key: "technologie", label: "Technologie" },
  { key: "autres", label: "Autres" },
];

export const ACTIVITIES: Activity[] = [
  {
    key: "boutique_generale",
    emoji: "🏪",
    label: "Boutique générale",
    description: "Commerce de proximité, articles variés.",
    category: "commerce_general",
  },
  {
    key: "supermarche_alimentation",
    emoji: "🛒",
    label: "Supermarché / Alimentation",
    description: "Épicerie, produits frais et grande distribution.",
    category: "commerce_general",
  },
  {
    key: "quincaillerie",
    emoji: "🔧",
    label: "Quincaillerie",
    description: "Matériaux, outillage et fournitures de construction.",
    category: "commerce_general",
  },
  {
    key: "grossiste",
    emoji: "📦",
    label: "Grossiste / Demi-grossiste",
    description: "Vente en gros et demi-gros à d'autres commerçants.",
    category: "commerce_general",
  },
  {
    key: "depot_entrepot",
    emoji: "🏭",
    label: "Dépôt / Entrepôt",
    description: "Stockage et distribution de marchandises.",
    category: "commerce_general",
  },
  {
    key: "pieces_detachees",
    emoji: "⚙️",
    label: "Pièces détachées auto/moto",
    description: "Vente de pièces mécaniques et accessoires.",
    category: "auto_moto",
  },
  {
    key: "boutique_moto",
    emoji: "🏍️",
    label: "Boutique de motos",
    description: "Vente de motos neuves/occasion et accessoires.",
    category: "auto_moto",
  },
  {
    key: "atelier_reparation",
    emoji: "🛠️",
    label: "Atelier de réparation",
    description: "Réparation auto, moto ou électroménager.",
    category: "auto_moto",
  },
  {
    key: "restaurant_maquis",
    emoji: "🍽️",
    label: "Restaurant / Maquis",
    description: "Restauration sur place ou à emporter.",
    category: "restauration",
  },
  {
    key: "bar_buvette",
    emoji: "🍹",
    label: "Bar / Buvette",
    description: "Boissons et rafraîchissements.",
    category: "restauration",
  },
  {
    key: "pharmacie",
    emoji: "💊",
    label: "Pharmacie",
    description: "Médicaments et produits de santé.",
    category: "sante_beaute",
  },
  {
    key: "cabinet_medical",
    emoji: "🩺",
    label: "Cabinet médical / Clinique",
    description: "Consultations, suivi des actes médicaux et statistiques épidémiologiques.",
    category: "sante_beaute",
  },
  {
    key: "cosmetique_beaute",
    emoji: "💄",
    label: "Cosmétique & Beauté",
    description: "Produits de beauté, salon de coiffure.",
    category: "sante_beaute",
  },
  {
    key: "vetements_chaussures",
    emoji: "👗",
    label: "Vêtements & Chaussures",
    description: "Prêt-à-porter et accessoires de mode.",
    category: "mode",
  },
  {
    key: "electronique_telephonie",
    emoji: "📱",
    label: "Électronique & Téléphonie",
    description: "Téléphones, ordinateurs et accessoires.",
    category: "technologie",
  },
  {
    key: "atelier_artisanat",
    emoji: "🧵",
    label: "Atelier (couture, menuiserie...)",
    description: "Fabrication et services artisanaux.",
    category: "autres",
  },
  {
    key: "autre",
    emoji: "🗂️",
    label: "Autre activité",
    description: "Votre activité n'est pas listée ci-dessus.",
    category: "autres",
  },
];

export function findActivity(key: string | null | undefined): Activity | undefined {
  if (!key) return undefined;
  return ACTIVITIES.find((a) => a.key === key);
}
