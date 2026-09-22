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
export type InvoiceTemplateId = "classique" | "moderne";

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
];

export const DEFAULT_INVOICE_TEMPLATE: InvoiceTemplateId = "classique";

export function findInvoiceTemplate(id: string | null | undefined): InvoiceTemplateMeta {
  return INVOICE_TEMPLATES.find((t) => t.id === id) ?? INVOICE_TEMPLATES[0];
}
