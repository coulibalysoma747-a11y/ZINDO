"use client";

import { useState, useTransition } from "react";
import { UserX } from "lucide-react";
import { updateBusinessSettingsAction } from "@/lib/actions/business-settings";
import type { BusinessSettings } from "@/lib/business-settings";

export function HideCustomerPanel({ settings }: { settings: BusinessSettings }) {
  const [enabled, setEnabled] = useState(settings.hideCustomerInPos);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="rounded-xl border border-zinc-200 p-4">
      <div className="flex items-start gap-2.5">
        <UserX className="mt-0.5 h-5 w-5 shrink-0 text-zindo-green-600" />
        <div>
          <p className="font-bold text-zinc-900">Masquer le client en caisse rapide</p>
          <p className="mt-1 text-sm text-zinc-500">
            Le client reste facultatif sur chaque vente (sauf à crédit, où il l&apos;a toujours été) — ce réglage
            retire juste le sélecteur de l&apos;écran de caisse pour aller plus vite.
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-zinc-100 p-3">
        <div>
          <p className="text-sm font-medium text-zinc-900">Masquer le client en caisse rapide</p>
          <p className="text-xs text-zinc-500">Désactivé : le client reste proposé (facultatif) sur chaque vente.</p>
        </div>
        <input
          type="checkbox"
          checked={enabled}
          disabled={pending}
          onChange={(e) => {
            const v = e.target.checked;
            setEnabled(v);
            setError(null);
            startTransition(async () => {
              const result = await updateBusinessSettingsAction({ hideCustomerInPos: v });
              if (result.error) setError(result.error);
            });
          }}
          className="h-5 w-5 shrink-0 rounded accent-zindo-green-500"
        />
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
