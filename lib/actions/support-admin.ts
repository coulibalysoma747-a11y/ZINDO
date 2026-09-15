"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { requireSuperAdmin } from "@/lib/superadmin-auth";
import { logAdminAction } from "@/lib/admin-audit";
import type { SupportTicketStatus } from "@/lib/db-types";

export type RespondResult = { success?: string; error?: string };

export async function respondToTicketAction(
  ticketId: string,
  response: string,
  status: SupportTicketStatus
): Promise<RespondResult> {
  const admin = await requireSuperAdmin();

  const { data: ticket } = await supabase
    .from("support_tickets")
    .select("id, response, respondedAt:responded_at")
    .eq("id", ticketId)
    .maybeSingle();
  if (!ticket) return { error: "Demande introuvable" };

  const { error } = await supabase
    .from("support_tickets")
    .update({
      response: response || (ticket.response as string | null),
      status,
      responded_at: response ? new Date().toISOString() : (ticket.respondedAt as string | null),
    })
    .eq("id", ticketId);
  if (error) {
    console.error("[respondToTicketAction] Échec de la mise à jour :", error.message);
    return { error: "Impossible d'enregistrer la réponse" };
  }

  await logAdminAction({
    superAdminId: admin.id,
    actorName: admin.name,
    action: "RESPOND",
    entity: "SupportTicket",
    entityId: ticketId,
    details: status,
  });

  revalidatePath("/admin/support");
  return { success: "Réponse enregistrée" };
}
