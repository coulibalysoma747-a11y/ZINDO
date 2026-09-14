import "server-only";
import { supabase } from "@/lib/supabase";

export async function logAction(params: {
  businessId: string;
  userId: string;
  action: string;
  entity: string;
  entityId?: string;
  details?: string;
}) {
  const { error } = await supabase.from("audit_logs").insert({
    business_id: params.businessId,
    user_id: params.userId,
    action: params.action,
    entity: params.entity,
    entity_id: params.entityId ?? null,
    details: params.details ?? null,
  });
  // Ne bloque jamais l'action métier appelante pour un échec de journalisation.
  if (error) console.error("[logAction] Échec écriture audit_logs :", error.message);
}
