import "server-only";
import { isFeatureEnabled, registerFeatureFlag } from "@/lib/feature-flags";

const DEBT_EXEMPTION_FLAG = "exception_dette_client";

/**
 * Exception par client au réglage « Refuser la vente si le client a une
 * dette » : depuis la fiche d'un client, l'administrateur l'autorise à
 * acheter malgré sa dette (client de confiance). Liste stockée dans les
 * réglages du commerce (debtBlockExemptCustomerIds), sans migration.
 */
export async function isDebtExemptionEnabled(businessId: string): Promise<boolean> {
  await registerFeatureFlag(
    DEBT_EXEMPTION_FLAG,
    "Exception de dette par client",
    "Quand « Refuser la vente si le client a une dette » est activé, un interrupteur sur la fiche client permet d'autoriser ce client précis à acheter malgré sa dette."
  );
  return isFeatureEnabled(DEBT_EXEMPTION_FLAG, businessId);
}
