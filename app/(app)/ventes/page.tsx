import { POSPageContent } from "./POSPageContent";

// Marge de sécurité pour l'enregistrement d'une vente (plusieurs appels
// réseau vers Supabase par article du panier, même parallélisés).
export const maxDuration = 30;

export default async function SalesPage() {
  return <POSPageContent mode="pos" />;
}
