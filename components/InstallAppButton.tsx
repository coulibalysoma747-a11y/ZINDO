"use client";

import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallAppButton({ className, iconOnly }: { className?: string; iconOnly?: boolean }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsStandalone(standalone);

    setIsIos(/iphone|ipad|ipod/i.test(navigator.userAgent));

    function onBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  // Tant que l'app n'est pas installée, le bouton reste toujours affiché —
  // sur téléphone comme sur ordinateur. Avant, il disparaissait dès que le
  // navigateur n'avait pas (encore, ou plus) déclenché beforeinstallprompt
  // (Chrome ne le redéclenche pas systématiquement après un premier refus) :
  // on affiche alors des instructions manuelles au clic plutôt que de faire
  // disparaître le bouton silencieusement.
  if (isStandalone) return null;

  async function handleClick() {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") setIsStandalone(true);
      setDeferredPrompt(null);
      return;
    }
    setShowHelp(true);
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        title="Installer l'application"
        className={
          className ??
          "flex items-center gap-2 rounded-lg bg-zindo-green-500 px-4 py-2 text-sm font-semibold text-white hover:bg-zindo-green-600"
        }
      >
        <Download className="h-4 w-4 shrink-0" />
        <span className={iconOnly ? "hidden sm:inline" : undefined}>Installer l&apos;application</span>
      </button>

      {showHelp && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
          onClick={() => setShowHelp(false)}
        >
          <div className="w-full max-w-sm rounded-t-2xl bg-white p-5 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="font-semibold text-zinc-900">Installer ZINDO</p>
              <button onClick={() => setShowHelp(false)} aria-label="Fermer">
                <X className="h-5 w-5 text-zinc-400" />
              </button>
            </div>
            {isIos ? (
              <p className="mt-2 text-sm text-zinc-600">
                Sur iPhone/iPad : appuyez sur <Share className="inline h-4 w-4 -mt-0.5" /> (Partager) en bas de
                Safari, puis choisissez <span className="font-medium">« Sur l&apos;écran d&apos;accueil »</span>.
              </p>
            ) : (
              <p className="mt-2 text-sm text-zinc-600">
                Ouvrez le menu de votre navigateur (⋮ en haut à droite, ou l&apos;icône d&apos;installation dans la
                barre d&apos;adresse), puis choisissez{" "}
                <span className="font-medium">« Installer l&apos;application »</span> ou{" "}
                <span className="font-medium">« Ajouter à l&apos;écran d&apos;accueil »</span>.
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
