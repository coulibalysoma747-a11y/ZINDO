"use server";

import { supabase } from "@/lib/supabase";
import { requireUser } from "@/lib/auth";

export type PushSubscriptionInput = { endpoint: string; p256dh: string; auth: string };

export async function subscribeToPushAction(sub: PushSubscriptionInput): Promise<{ error?: string }> {
  const user = await requireUser();
  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(
      { business_id: user.businessId, user_id: user.id, endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
      { onConflict: "endpoint" }
    );
  if (error) {
    console.error("[subscribeToPushAction] Échec de l'enregistrement :", error.message);
    return { error: "Impossible d'activer les notifications" };
  }
  return {};
}

export async function unsubscribeFromPushAction(endpoint: string): Promise<{ error?: string }> {
  const user = await requireUser();
  const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint).eq("user_id", user.id);
  if (error) {
    console.error("[unsubscribeFromPushAction] Échec de la suppression :", error.message);
    return { error: "Impossible de désactiver les notifications" };
  }
  return {};
}

export async function isPushEnabledOnThisDeviceAction(endpoint: string): Promise<boolean> {
  const user = await requireUser();
  const { data } = await supabase
    .from("push_subscriptions")
    .select("id")
    .eq("endpoint", endpoint)
    .eq("user_id", user.id)
    .maybeSingle();
  return !!data;
}
