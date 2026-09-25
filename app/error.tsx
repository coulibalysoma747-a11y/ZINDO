"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import * as Sentry from "@sentry/nextjs";
import { AuthCard } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/Button";

const AUTO_RELOAD_KEY = "zindo_error_auto_reload";
const AUTO_RELOAD_COOLDOWN_MS = 60_000;

/**
 * Filet de sécurité global : si une page plante côté serveur (ex. base de
 * données injoignable), Next.js affiche ce composant à la place de la page
 * d'erreur générique du navigateur. Ne couvre pas les erreurs de
 * app/layout.tsx lui-même (voir global-error.tsx pour ce cas).
 */
export default function GlobalErrorBoundary({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Presque toujours un décalage de version juste après une mise à jour de
  // ZINDO (page ouverte avant le déploiement) : un rechargement complet règle
  // le problème. On le fait automatiquement une fois — pas plus d'une fois par
  // minute, pour ne jamais boucler si l'erreur est réelle.
  const [reloading, setReloading] = useState(true);

  useEffect(() => {
    console.error("[GlobalErrorBoundary]", error);
    Sentry.captureException(error);
    let last = 0;
    try {
      last = Number(sessionStorage.getItem(AUTO_RELOAD_KEY)) || 0;
    } catch {
      // Stockage indisponible (navigation privée...) : pas de rechargement auto.
      last = Date.now();
    }
    if (Date.now() - last > AUTO_RELOAD_COOLDOWN_MS) {
      try {
        sessionStorage.setItem(AUTO_RELOAD_KEY, String(Date.now()));
      } catch {}
      window.location.reload();
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- décision prise après lecture du sessionStorage (client uniquement).
    setReloading(false);
  }, [error]);

  if (reloading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4">
        <p className="text-sm text-zinc-500">Mise à jour de ZINDO...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4">
      <div className="w-full max-w-sm">
        <AuthCard>
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-bold text-zindo-ink-900">Une erreur est survenue</h2>
            <p className="text-sm text-zinc-500">
              La page n&apos;a pas pu s&apos;afficher. Ce n&apos;est pas forcément lié à votre connexion —
              réessayez, et si le problème persiste, contactez le support.
            </p>
            {error.digest && (
              <p className="text-xs text-zinc-400">Référence : {error.digest}</p>
            )}
            <div className="flex w-full flex-col gap-2 pt-2">
              <Button type="button" onClick={() => window.location.reload()} className="w-full">
                Réessayer
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  window.location.href = "/dashboard";
                }}
              >
                Retour au tableau de bord
              </Button>
            </div>
          </div>
        </AuthCard>
      </div>
    </div>
  );
}
