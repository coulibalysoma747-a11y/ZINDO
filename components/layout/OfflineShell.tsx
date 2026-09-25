"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { WifiOff } from "lucide-react";
import { getPendingWrites } from "@/lib/offline/db";
import { syncPendingWrites } from "@/lib/offline/sync";

/** Pages dont une copie est gardée pour s'ouvrir sans Internet (leur code gère déjà la file d'attente hors ligne). */
export const OFFLINE_PAGES = [
  "/dashboard",
  "/ventes",
  "/caisse",
  "/produits",
  "/stock",
  "/stock/entree",
  "/stock/sortie",
  "/clients",
  "/fournisseurs",
  "/achats/nouveau",
  "/inventaire/nouveau",
];

function subscribeOnline(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

function isDesktopApp() {
  return typeof window !== "undefined" && "zindoDesktop" in window;
}

async function postToServiceWorker(message: unknown) {
  if (!("serviceWorker" in navigator)) return;
  const reg = await navigator.serviceWorker.register("/sw.js");
  const worker = reg.active ?? (await navigator.serviceWorker.ready).active;
  worker?.postMessage(message);
}

/** Supprime les copies hors ligne de l'appareil — à appeler à la déconnexion (appareil partagé). */
export async function clearOfflineCopies() {
  try {
    if (typeof caches !== "undefined") {
      await Promise.all([caches.delete("zindo-pages"), caches.delete("zindo-static")]);
    }
  } catch {
    // Best-effort : la déconnexion ne doit jamais échouer pour ça.
  }
}

/**
 * Mode hors ligne du navigateur et du téléphone (flag
 * « hors_ligne_navigateur ») : demande au service worker (public/sw.js) de
 * garder une copie des pages essentielles, synchronise la file d'attente au
 * retour de la connexion, et signale la coupure. Inutile dans l'application
 * Windows, qui a son propre mode hors ligne (lib/offline/server-cache.ts).
 */
export function OfflineShell({ enabled, userId }: { enabled: boolean; userId: string }) {
  const online = useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (isDesktopApp()) return;
    if (!enabled) {
      postToServiceWorker({ type: "ZINDO_OFFLINE_DISABLE" }).catch(() => {});
      return;
    }
    if (navigator.onLine) {
      postToServiceWorker({ type: "ZINDO_OFFLINE_ENABLE", userId, pages: OFFLINE_PAGES }).catch(() => {});
    }

    function refreshPending() {
      getPendingWrites()
        .then((writes) => setPendingCount(writes.length))
        .catch(() => {});
    }
    function handleOnline() {
      syncPendingWrites()
        .catch(() => {})
        .finally(refreshPending);
    }

    if (navigator.onLine) handleOnline();
    else refreshPending();
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", refreshPending);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", refreshPending);
    };
  }, [enabled, userId]);

  if (!enabled || online) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-2 z-50 flex justify-center px-4 print:hidden">
      <div className="flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800 shadow-sm dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
        <WifiOff className="h-3.5 w-3.5 shrink-0" />
        <span>
          Hors ligne — vos opérations seront synchronisées au retour d&apos;Internet
          {pendingCount > 0 ? ` (${pendingCount} en attente)` : ""}
        </span>
      </div>
    </div>
  );
}
