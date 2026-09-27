import "server-only";
import { isFeatureEnabled, registerFeatureFlag } from "@/lib/feature-flags";

const SALES_SEARCH_FLAG = "recherche_ventes";

/** Flag recherche_ventes : barre de recherche dans l'historique de l'écran Vente. */
export async function isSalesSearchEnabled(businessId: string): Promise<boolean> {
  await registerFeatureFlag(
    SALES_SEARCH_FLAG,
    "Recherche dans l'historique des ventes",
    "Écran Vente : barre de recherche sur la période choisie — n° de ticket, nom du vendeur, nom du client, total ou montant payé exact. Les totaux se recalculent sur les ventes trouvées."
  );
  return isFeatureEnabled(SALES_SEARCH_FLAG, businessId);
}

/** Minuscules sans accents ni espaces superflus. */
function normalize(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

/**
 * Une vente correspond-elle à la recherche ? Texte : n° de ticket, vendeur,
 * client (contient). Nombre seul (« 1500 », « 1 500 », « 1500 FCFA ») :
 * total ou montant payé exactement égal, ou n° de ticket qui le contient.
 */
export function saleMatchesQuery(
  sale: { number: string; total: number; amountPaid: number | null; customerName: string | null; sellerName: string },
  query: string
): boolean {
  const q = normalize(query);
  if (!q) return true;
  const digits = q.replace(/fcfa|f cfa|xof|\s|\./g, "");
  if (/^\d+$/.test(digits)) {
    const amount = Number(digits);
    if (sale.total === amount || sale.amountPaid === amount) return true;
    return normalize(sale.number).includes(digits);
  }
  return [sale.number, sale.sellerName, sale.customerName ?? "Client de passage"].some((field) => normalize(field).includes(q));
}
