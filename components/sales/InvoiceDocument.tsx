import { Facture, type FactureData } from "./Facture";
import { FactureModerne } from "./FactureModerne";
import { FactureBoutique } from "./FactureBoutique";

/**
 * Point d'aiguillage unique entre les modèles de Facture A4 (voir
 * lib/invoice-templates.ts) — les 3 sites d'affichage (FactureView,
 * DevisView, ReceiptPrintPanel) rendent ce composant plutôt que <Facture>
 * directement, pour n'avoir à ajouter qu'un `case` ici à chaque nouveau
 * modèle plutôt que de toucher les 3 sites à chaque fois.
 */
export function InvoiceDocument({ data }: { data: FactureData }) {
  switch (data.templateId) {
    case "moderne":
      return <FactureModerne data={data} />;
    case "boutique":
      return <FactureBoutique data={data} />;
    case "classique":
    default:
      return <Facture data={data} />;
  }
}
