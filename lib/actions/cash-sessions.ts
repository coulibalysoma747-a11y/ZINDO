"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { getCurrentLocation } from "@/lib/location";
import { generateSessionNumber } from "@/lib/reference";
import { computeSessionStats } from "@/lib/cash-sessions";
import { getBusinessSettings } from "@/lib/business-settings";
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

  const businessSettings = await getBusinessSettings(user.businessId);

  const { data: openSessions } = await supabase
    .from("cash_sessions")
    .select("id, userId:user_id")
    .eq("business_id", user.businessId)
    .eq("location_id", currentLocation.id)
    .eq("status", "OUVERTE");

  if (businessSettings.allowTwoCashiers) {
    // "Caisse à deux" : chaque caissier a sa propre session, jusqu'à deux
    // sessions ouvertes en même temps sur la même boutique.
    if ((openSessions ?? []).some((s) => s.userId === user.id)) {
      return { error: "Vous avez déjà une session de caisse ouverte sur cette boutique" };
    }
    if ((openSessions ?? []).length >= 2) {
      return { error: "Deux sessions de caisse sont déjà ouvertes pour cette boutique" };
    }
  } else if ((openSessions ?? []).length > 0) {
    return { error: "Une session de caisse est déjà ouverte pour cette boutique" };
  }

  const number = await generateSessionNumber(user.businessId);
  const { data: session, error } = await supabase
    .from("cash_sessions")
    .insert({
      business_id: user.businessId,
      location_id: currentLocation.id,
      number,
      user_id: user.id,
      opening_amount: parsed.data.openingAmount,
    })
    .select("id")
    .single();
  if (error || !session) {
    console.error("[openSessionAction] Échec de l'ouverture :", error?.message);
    return { error: "Impossible d'ouvrir la session de caisse" };
  }

  await logAction({
    businessId: user.businessId,
    userId: user.id,
    action: "OPEN",
    entity: "CashSession",
    entityId: session.id as string,
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

  const { data: session } = await supabase
    .from("cash_sessions")
    .select("id, businessId:business_id, locationId:location_id, openingAmount:opening_amount, openedAt:opened_at, status")
    .eq("id", input.sessionId)
    .eq("business_id", user.businessId)
    .maybeSingle();
  if (!session) return { success: false, error: "Session introuvable" };
  if (session.status === "FERMEE") return { success: false, error: "Cette session est déjà clôturée" };
  if (!Number.isFinite(input.countedCash) || input.countedCash < 0) {
    return { success: false, error: "Le montant compté doit être positif ou nul" };
  }

  const closedAt = new Date();
  const stats = await computeSessionStats({
    businessId: session.businessId as string,
    locationId: session.locationId as string,
    sessionId: session.id as string,
    openingAmount: session.openingAmount as number,
    openedAt: new Date(session.openedAt as string),
    closedAt,
  });
  const variance = input.countedCash - stats.expectedCash;

  const { error } = await supabase
    .from("cash_sessions")
    .update({
      status: "FERMEE",
      closed_at: closedAt.toISOString(),
      counted_cash: input.countedCash,
      note: input.note || null,
      sales_count: stats.salesCount,
      total_revenue: stats.totalRevenue,
      cash_collected: stats.cashCollected,
      mobile_collected: stats.mobileCollected,
      card_collected: stats.cardCollected,
      other_collected: stats.otherCollected,
      credit_collected: stats.creditCollected,
      gross_margin: stats.grossMargin,
      expenses_total: stats.expensesTotal,
      net_margin: stats.netMargin,
      margin_rate: stats.marginRate,
      expected_cash: stats.expectedCash,
      variance,
    })
    .eq("id", session.id);
  if (error) {
    console.error("[closeSessionAction] Échec de la clôture :", error.message);
    return { success: false, error: "Impossible de clôturer la session" };
  }

  await logAction({
    businessId: user.businessId,
    userId: user.id,
    action: "CLOSE",
    entity: "CashSession",
    entityId: session.id as string,
    details: `Compté ${input.countedCash}, écart ${variance}`,
  });

  revalidatePath("/ventes");
  revalidatePath(`/ventes/session/${session.id}`);
  revalidatePath("/ventes/sessions");
  return { success: true, sessionId: session.id as string };
}
