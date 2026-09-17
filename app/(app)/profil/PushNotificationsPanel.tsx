"use client";

import { useEffect, useState, useTransition } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { subscribeToPushAction, unsubscribeFromPushAction } from "@/lib/actions/push-subscriptions";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

type Status = "loading" | "unsupported" | "denied" | "enabled" | "disabled";

export function PushNotificationsPanel() {
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    // Détection de capacités navigateur différée après le montage (via une
    // microtâche) : ces API n'existent pas côté serveur, donc rien de tout
    // ceci ne peut se calculer pendant le rendu lui-même.
    Promise.resolve().then(async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setStatus("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        setStatus("denied");
        return;
      }
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        setStatus(sub ? "enabled" : "disabled");
      } catch {
        setStatus("disabled");
      }
    });
  }, []);

  function enable() {
    setError(null);
    startTransition(async () => {
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        setError("Notifications non configurées côté serveur");
        return;
      }
      try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setStatus("denied");
          return;
        }
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey) as unknown as BufferSource,
        });
        const json = sub.toJSON();
        const result = await subscribeToPushAction({
          endpoint: sub.endpoint,
          p256dh: json.keys?.p256dh ?? "",
          auth: json.keys?.auth ?? "",
        });
        if (result.error) {
          setError(result.error);
          return;
        }
        setStatus("enabled");
      } catch {
        setError("Impossible d'activer les notifications");
      }
    });
  }

  function disable() {
    setError(null);
    startTransition(async () => {
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await unsubscribeFromPushAction(sub.endpoint);
          await sub.unsubscribe();
        }
        setStatus("disabled");
      } catch {
        setError("Impossible de désactiver les notifications");
      }
    });
  }

  if (status === "loading") return null;
  if (status === "unsupported") {
    return <p className="text-sm text-zinc-400">Notifications push non disponibles sur ce navigateur.</p>;
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-zinc-500">
        Recevez une alerte sur cet appareil pour les nouvelles ventes, le stock bas/en rupture et les échéances de
        crédit dépassées — même quand ZINDO n&apos;est pas ouvert.
      </p>
      {status === "denied" && (
        <p className="text-sm text-amber-600">
          Notifications bloquées pour ZINDO dans votre navigateur — autorisez-les dans les réglages du site pour les
          activer.
        </p>
      )}
      {status !== "denied" && (
        <Button type="button" variant={status === "enabled" ? "outline" : "primary"} disabled={pending} onClick={status === "enabled" ? disable : enable}>
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : status === "enabled" ? (
            <>
              <BellOff className="h-4 w-4" /> Désactiver sur cet appareil
            </>
          ) : (
            <>
              <Bell className="h-4 w-4" /> Activer sur cet appareil
            </>
          )}
        </Button>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
