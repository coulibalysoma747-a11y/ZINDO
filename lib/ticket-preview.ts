import "server-only";
import { isFeatureEnabled, registerFeatureFlag } from "@/lib/feature-flags";

const TICKET_PREVIEW_FLAG = "apercu_ticket_parametres";

export async function isTicketPreviewEnabled(businessId: string): Promise<boolean> {
  await registerFeatureFlag(
    TICKET_PREVIEW_FLAG,
    "Aperçu du ticket dans les Paramètres",
    "Bouton « Aperçu du ticket » dans Paramètres › Commerce : ticket d'exemple (58/80 mm, A4, styles) avec le logo, le pied de ticket et le QR code réglés, même avant d'enregistrer."
  );
  return isFeatureEnabled(TICKET_PREVIEW_FLAG, businessId);
}
