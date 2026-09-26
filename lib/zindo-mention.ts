import "server-only";
import { isFeatureEnabled, registerFeatureFlag } from "@/lib/feature-flags";

const ZINDO_MENTION_FLAG = "mention_zindo_ticket";

/** Flag « mention_zindo_ticket » : petite ligne « Géré avec ZINDO » en bas des tickets et des factures. */
export async function isZindoMentionEnabled(businessId: string): Promise<boolean> {
  await registerFeatureFlag(
    ZINDO_MENTION_FLAG,
    "Mention ZINDO sur les tickets",
    "Ajoute une petite ligne « Géré avec ZINDO · zindo.site » en bas des tickets de caisse et des factures A4 : chaque ticket remis au client fait connaître ZINDO."
  );
  return isFeatureEnabled(ZINDO_MENTION_FLAG, businessId);
}
