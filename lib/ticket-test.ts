import "server-only";
import { isFeatureEnabled, registerFeatureFlag } from "@/lib/feature-flags";

const TICKET_TEST_FLAG = "ticket_test";

export async function isTicketTestEnabled(businessId: string): Promise<boolean> {
  await registerFeatureFlag(
    TICKET_TEST_FLAG,
    "Imprimer un ticket test",
    "Bouton « Imprimer un ticket test » dans Paramètres › Commerce : imprime un ticket fictif avec les réglages enregistrés pour vérifier l'imprimante, sans créer de vente."
  );
  return isFeatureEnabled(TICKET_TEST_FLAG, businessId);
}
