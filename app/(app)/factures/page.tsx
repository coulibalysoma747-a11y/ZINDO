import { POSPageContent } from "@/app/(app)/ventes/POSPageContent";

// Voir app/(app)/ventes/page.tsx pour l'explication.
export const maxDuration = 30;

export default async function FacturesPage() {
  return <POSPageContent mode="facture" />;
}
