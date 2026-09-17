"use client";

import { useState, useTransition } from "react";
import { Hash } from "lucide-react";
import { updateBusinessSettingsAction } from "@/lib/actions/business-settings";
import type { BusinessSettings } from "@/lib/business-settings";

const OPTIONS = [
  { value: "both" as const, label: "Les deux (par défaut)" },
  { value: "input" as const, label: "Champ de saisie uniquement" },
  { value: "buttons" as const, label: "Boutons (−) et (+) uniquement" },
];

export function QuantityInputModePanel({ settings }: { settings: BusinessSettings }) {
  const [mode, setMode] = useState(settings.posQuantityInputMode);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="rounded-xl border border-zinc-200 p-4">
      <div className="flex items-start gap-2.5">
        <Hash className="mt-0.5 h-5 w-5 shrink-0 text-zindo-green-600" />
        <div>
          <p className="font-bold text-zinc-900">Caisse — saisie de la quantité</p>
          <p className="mt-1 text-sm text-zinc-500">
            Un seul mode à la fois pour la quantité dans le panier de caisse : le champ de saisie (tapez le nombre) ou
            les boutons (−) et (+). Le panier se met à jour automatiquement dans les deux cas.
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-2">
        {OPTIONS.map((opt) => (
          <label key={opt.value} className="flex items-center gap-2 rounded-lg border border-zinc-100 p-3 text-sm">
            <input
              type="radio"
              name="posQuantityInputMode"
              checked={mode === opt.value}
              disabled={pending}
              onChange={() => {
                setMode(opt.value);
                setError(null);
                startTransition(async () => {
                  const result = await updateBusinessSettingsAction({ posQuantityInputMode: opt.value });
                  if (result.error) setError(result.error);
                });
              }}
              className="h-4 w-4 accent-zindo-green-500"
            />
            {opt.label}
          </label>
        ))}
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
