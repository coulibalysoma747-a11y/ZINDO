"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { getCurrentLocation } from "@/lib/location";
import { generateSessionNumber } from "@/lib/reference";
import { computeSessionStats } from "@/lib/cash-sessions";
import { logAction } from "@/lib/audit";

export type ActionState = { error?: string; success?: string } | undefined;

const openSchema = z.object({
  openingAmount: z.coerce.number().min(0, "Le montant d'ouverture doit être positif ou nul"),
});

export async function openSessionAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requirePermission(PERMISSIONS.CASH_SESSIONS_MANAGE);
  const parsed = openSchema.safeParse({ openingAmount: formData.get("openingAmount") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const currentLocation = await getCurrentLocation(user.businessId);
  if (!currentLocation) return { error: "Configurez d'abord une boutique" };

  const existing = await prisma.cashSession.findFirst({
    where: { businessId: user.businessId, locationId: currentLocation.id, status: "OUVERTE" },
  });
  if (existing) return { error: "Une session de caisse est déjà ouverte pour cette boutique" };

  const number = await generateSessionNumber(user.businessId);
  const session = await prisma.cashSession.create({
    data: {
      businessId: user.businessId,
      locationId: currentLocation.id,
      number,
      userId: user.id,
      openingAmount: parsed.data.openingAmount,
    },
  });

  await logAction({
    businessId: user.businessId,
    userId: user.id,
    action: "OPEN",
    entity: "CashSession",
    entityId: session.id,
    details: `Ouverture caisse ${parsed.data.openingAmount}`,
  });

  revalidatePath("/ventes");
  return { success: "Session de caisse ouverte" };
}

export type CloseSessionInput = {
  sessionId: string;
  countedCash: number;
  note?: string;
};

export type CloseSessionResult = { success: true; sessionId: string } | { success: false; error: string };

export async function closeSessionAction(input: CloseSessionInput): Promise<CloseSessionResult> {
  const user = await requirePermission(PERMISSIONS.CASH_SESSIONS_MANAGE);

  const session = await prisma.cashSession.findFirst({
    where: { id: input.sessionId, businessId: user.businessId },
  });
  if (!session) return { success: false, error: "Session introuvable" };
  if (session.status === "FERMEE") return { success: false, error: "Cette session est déjà clôturée" };
  if (!Number.isFinite(input.countedCash) || input.countedCash < 0) {
    return { success: false, error: "Le montant compté doit être positif ou nul" };
  }

  const closedAt = new Date();
  const stats = await computeSessionStats({
    businessId: session.businessId,
    locationId: session.locationId,
    openingAmount: session.openingAmount,
    openedAt: session.openedAt,
    closedAt,
  });
  const variance = input.countedCash - stats.expectedCash;

  await prisma.cashSession.update({
    where: { id: session.id },
    data: {
      status: "FERMEE",
      closedAt,
      countedCash: input.countedCash,
      note: input.note || null,
      salesCount: stats.salesCount,
      totalRevenue: stats.totalRevenue,
      cashCollected: stats.cashCollected,
      mobileCollected: stats.mobileCollected,
      cardCollected: stats.cardCollected,
      otherCollected: stats.otherCollected,
      creditCollected: stats.creditCollected,
      grossMargin: stats.grossMargin,
      expensesTotal: stats.expensesTotal,
      netMargin: stats.netMargin,
      marginRate: stats.marginRate,
      expectedCash: stats.expectedCash,
      variance,
    },
  });

  await logAction({
    businessId: user.businessId,
    userId: user.id,
    action: "CLOSE",
    entity: "CashSession",
    entityId: session.id,
    details: `Compté ${input.countedCash}, écart ${variance}`,
  });

  revalidatePath("/ventes");
  revalidatePath(`/ventes/session/${session.id}`);
  revalidatePath("/ventes/sessions");
  return { success: true, sessionId: session.id };
}
