"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/superadmin-auth";
import { logAdminAction } from "@/lib/admin-audit";
import type { SupportTicketStatus } from "@prisma/client";

export type RespondResult = { success?: string; error?: string };

export async function respondToTicketAction(
  ticketId: string,
  response: string,
  status: SupportTicketStatus
): Promise<RespondResult> {
  const admin = await requireSuperAdmin();

  const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
  if (!ticket) return { error: "Demande introuvable" };

  await prisma.supportTicket.update({
    where: { id: ticketId },
    data: {
      response: response || ticket.response,
      status,
      respondedAt: response ? new Date() : ticket.respondedAt,
    },
  });

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
