"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Store } from "lucide-react";
import { updateBusinessSettingsAction } from "@/lib/actions/business-settings";

export function HasPhysicalStoreBanner() {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

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
      </span>
    </div>
  );
}
