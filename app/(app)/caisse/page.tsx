import { CaissePageContent } from "./CaissePageContent";

// Même marge que /ventes : createSaleAction fait plusieurs appels réseau par
// article du panier lors de la finalisation du paiement.
export const maxDuration = 30;

export default async function CaissePage() {
  return <CaissePageContent />;
}
