import "server-only";
import { prisma } from "@/lib/prisma";

export async function logAction(params: {
  businessId: string;
  userId: string;
  action: string;
  entity: string;
  entityId?: string;
  details?: string;
}) {
  await prisma.auditLog.create({ data: params });
}
