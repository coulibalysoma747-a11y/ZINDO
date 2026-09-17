import "server-only";
import webpush from "web-push";
import { supabase } from "@/lib/supabase";

let configured = false;
function ensureConfigured() {
  if (configured) return true;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:contact@zindo.app", publicKey, privateKey);
  configured = true;
  return true;
}

export type PushPayload = { title: string; body: string; link?: string };

/**
 * Envoie une notification push à tous les appareils qui l'ont activée pour ce
 * commerce (voir /profil > Notifications push). Best-effort par appareil :
 * un abonnement expiré/révoqué (404/410) est supprimé silencieusement, les
 * autres erreurs sont journalisées sans jamais faire échouer l'appelant —
 * l'événement métier (vente, alerte stock...) qui déclenche l'envoi ne doit
 * jamais être bloqué par un souci de notification.
 */
export async function sendPushToBusiness(businessId: string, payload: PushPayload): Promise<void> {
  if (!ensureConfigured()) return;

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("business_id", businessId);
  if (!subs || subs.length === 0) return;

  const body = JSON.stringify(payload);
  await Promise.all(
    (subs as unknown as Array<{ id: string; endpoint: string; p256dh: string; auth: string }>).map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body
        );
      } catch (e) {
        const statusCode = (e as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        } else {
          console.error("[sendPushToBusiness] Échec de l'envoi :", e);
        }
      }
    })
  );
}
