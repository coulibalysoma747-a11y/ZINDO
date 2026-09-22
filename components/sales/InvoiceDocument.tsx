import { Facture, type FactureData } from "./Facture";
import { FactureModerne } from "./FactureModerne";
import { FactureBoutique } from "./FactureBoutique";
import { FactureAtelier } from "./FactureAtelier";
import { FacturePharmacie } from "./FacturePharmacie";
import { FactureGrossiste } from "./FactureGrossiste";
import { FactureMoto } from "./FactureMoto";
import { FactureRestaurant } from "./FactureRestaurant";

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
    case "atelier":
      return <FactureAtelier data={data} />;
    case "pharmacie":
      return <FacturePharmacie data={data} />;
    case "grossiste":
      return <FactureGrossiste data={data} />;
    case "moto":
      return <FactureMoto data={data} />;
    case "restaurant":
      return <FactureRestaurant data={data} />;
    case "classique":
    default:
      return <Facture data={data} />;
  }
}
