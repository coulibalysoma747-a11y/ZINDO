"use client";

import { useState, useTransition } from "react";
import { Users } from "lucide-react";
import { updateBusinessSettingsAction } from "@/lib/actions/business-settings";
import type { BusinessSettings } from "@/lib/business-settings";

export function CaisseADeuxPanel({ settings }: { settings: BusinessSettings }) {
  const [enabled, setEnabled] = useState(settings.allowTwoCashiers);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="rounded-xl border border-zinc-200 p-4">
      <div className="flex items-start gap-2.5">
        <Users className="mt-0.5 h-5 w-5 shrink-0 text-zindo-green-600" />
        <div>
          <p className="font-bold text-zinc-900">Caisse à deux</p>
          <p className="mt-1 text-sm text-zinc-500">
            Deux caissiers peuvent ouvrir chacun leur propre session de caisse en même temps sur la même boutique.
            Chacun n&apos;encaisse et ne clôture que ses propres ventes.
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-zinc-100 p-3">
        <div>
          <p className="text-sm font-medium text-zinc-900">Autoriser deux sessions de caisse ouvertes en même temps</p>
          <p className="text-xs text-zinc-500">Sinon, une seule session partagée à la fois (comportement actuel).</p>
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
              const result = await updateBusinessSettingsAction({ allowTwoCashiers: v });
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
