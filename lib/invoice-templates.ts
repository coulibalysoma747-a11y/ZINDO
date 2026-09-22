/**
 * Registre des modèles visuels de Facture A4 disponibles dans le sélecteur
 * de /parametres (voir components/sales/InvoiceTemplatePanel.tsx). Chaque
 * modèle est un composant React autonome dans components/sales/, tous
 * interchangeables car construits sur le même type FactureData — voir
 * components/sales/InvoiceDocument.tsx pour le point d'aiguillage réel.
 *
 * Pas de directive "use server" ici : fichier de données neutre, importé à
 * la fois par des composants client (le sélecteur) et des actions serveur.
 */
export type InvoiceTemplateId =
  | "classique"
  | "moderne"
  | "boutique"
  | "atelier"
  | "pharmacie"
  | "grossiste"
  | "moto"
  | "restaurant"
  | "epicerie"
  | "cabinet";

export type InvoiceTemplateMeta = {
  id: InvoiceTemplateId;
  label: string;
  description: string;
  /** Activités pour lesquelles ce modèle est suggéré en premier — purement indicatif dans l'UI, n'importe quel commerce peut choisir n'importe quel modèle. */
  suggestedFor: string[];
};

export const INVOICE_TEMPLATES: InvoiceTemplateMeta[] = [
  {
    id: "classique",
    label: "Classique",
    description: "Document officiel noir & blanc, filets doubles — le style facture papier traditionnel. Modèle par défaut.",
    suggestedFor: ["Quincaillerie", "Grossiste", "Boutique générale"],
  },
  {
    id: "moderne",
    label: "Moderne",
    description: "Épuré, sans filets décoratifs, une seule couleur d'accent réservée au total.",
    suggestedFor: ["Électronique & Téléphonie", "Services"],
  },
  {
    id: "boutique",
    label: "Boutique",
    description: "Bandeau couleur, articles en lignes arrondies — un document plus chaleureux pour la mode et les commerces de détail.",
    suggestedFor: ["Vêtements & Chaussures", "Cosmétique & Beauté"],
  },
  {
    id: "atelier",
    label: "Atelier",
    description: "Fond sombre façon fiche de travail, accent cuivre — pour les ateliers de réparation, la chaudronnerie et les garages.",
    suggestedFor: ["Atelier de réparation", "Pièces détachées auto/moto", "Atelier (couture, menuiserie...)"],
  },
  {
    id: "pharmacie",
    label: "Pharmacie",
    description: "Blanc/teal clinique, très ordonné, référence produit affichée sous chaque ligne.",
    suggestedFor: ["Pharmacie", "Cabinet médical / Clinique"],
  },
  {
    id: "grossiste",
    label: "Grossiste",
    description: "Ledger noir & blanc à forte densité, filets épais façon bon de livraison — pour les grosses listes d'articles.",
    suggestedFor: ["Grossiste / Demi-grossiste", "Dépôt / Entrepôt", "Quincaillerie"],
  },
  {
    id: "moto",
    label: "Moto",
    description: "Fond sombre, accent bleu vif, bandeau de filets obliques en tête façon piste.",
    suggestedFor: ["Pièces détachées auto/moto", "Boutique de motos"],
  },
  {
    id: "restaurant",
    label: "Restaurant",
    description: "Chaleureuse, filets pointillés façon addition de table, total dans une pastille arrondie.",
    suggestedFor: ["Restaurant / Maquis", "Bar / Buvette"],
  },
  {
    id: "epicerie",
    label: "Épicerie",
    description: "Blanc/vert frais, grille dense façon ticket de supermarché élargi — pour les factures à beaucoup de lignes.",
    suggestedFor: ["Supermarché / Alimentation", "Boutique générale"],
  },
  {
    id: "cabinet",
    label: "Cabinet",
    description: "Blanc/indigo formel, encadré sobre façon document de consultation.",
    suggestedFor: ["Cabinet médical / Clinique"],
  },
];

export const DEFAULT_INVOICE_TEMPLATE: InvoiceTemplateId = "classique";

export function findInvoiceTemplate(id: string | null | undefined): InvoiceTemplateMeta {
  return INVOICE_TEMPLATES.find((t) => t.id === id) ?? INVOICE_TEMPLATES[0];
}
