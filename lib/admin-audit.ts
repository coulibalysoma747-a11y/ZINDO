import "server-only";
import { prisma } from "@/lib/prisma";

export async function logAdminAction(params: {
  superAdminId: string;
  actorName: string;
  action: string;
  entity: string;
  entityId?: string;
  details?: string;
}) {
  await prisma.superAdminAuditLog.create({ data: params });
}
