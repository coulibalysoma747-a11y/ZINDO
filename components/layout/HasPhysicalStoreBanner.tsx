"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Store, X } from "lucide-react";
import { updateBusinessSettingsAction } from "@/lib/actions/business-settings";

export function HasPhysicalStoreBanner() {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const [closed, setClosed] = useState(false);

  // Croix : on cache le bandeau (cookie d'un an) sans répondre ; il prenait
  // beaucoup de place sur téléphone. La réponse n'est utilisée nulle part pour
  // l'instant (seulement enregistrée dans les réglages du commerce).
  function close() {
    document.cookie = "zindo_hide_store_banner=1; path=/; max-age=31536000; samesite=lax";
    setClosed(true);
  }
  if (closed) return null;

  function answer(hasPhysicalStore: boolean) {
    startTransition(async () => {
      await updateBusinessSettingsAction({ hasPhysicalStore });
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-800 print:hidden">
      <span className="flex items-center gap-2">
        <Store className="h-4 w-4 shrink-0" />
        Avez-vous une boutique ou un local physique ?
      </span>
      <span className="flex shrink-0 gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => answer(true)}
          className="rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          Oui, j&apos;ai un local
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => answer(false)}
          className="rounded-md border border-blue-300 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
        >
          Non, uniquement en ligne
        </button>
        <button
          type="button"
          onClick={close}
          aria-label="Fermer ce message"
          title="Fermer"
          className="rounded-md p-1 text-blue-700 hover:bg-blue-100"
        >
          <X className="h-4 w-4" />
        </button>
      </span>
    </div>
  );
}
