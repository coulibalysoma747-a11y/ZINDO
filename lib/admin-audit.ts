import "server-only";
import { supabase } from "@/lib/supabase";

export async function logAdminAction(params: {
  superAdminId: string;
  actorName: string;
  action: string;
  entity: string;
  entityId?: string;
  details?: string;
}) {
  const { error } = await supabase.from("super_admin_audit_logs").insert({
    super_admin_id: params.superAdminId,
    actor_name: params.actorName,
    action: params.action,
    entity: params.entity,
    entity_id: params.entityId ?? null,
    details: params.details ?? null,
  });
  if (error) console.error("[logAdminAction] Échec écriture super_admin_audit_logs :", error.message);
}
