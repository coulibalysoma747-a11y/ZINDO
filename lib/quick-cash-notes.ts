import "server-only";
import { isFeatureEnabled, registerFeatureFlag } from "@/lib/feature-flags";

const QUICK_CASH_NOTES_FLAG = "billets_rapides";

export async function isQuickCashNotesEnabled(businessId: string): Promise<boolean> {
  await registerFeatureFlag(
    QUICK_CASH_NOTES_FLAG,
    "Billets rapides à la caisse",
    "Gros boutons « Exact », 500, 1 000, 2 000, 5 000 et 10 000 FCFA sous le montant reçu (paiement en espèces) : un clic sur le billet donné affiche aussitôt la monnaie à rendre. Plusieurs clics s'additionnent (ex. 10 000 + 5 000)."
  );
  return isFeatureEnabled(QUICK_CASH_NOTES_FLAG, businessId);
}
