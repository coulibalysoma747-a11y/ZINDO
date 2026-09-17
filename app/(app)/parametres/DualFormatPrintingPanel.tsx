"use client";

import { useState, useTransition } from "react";
import { Printer } from "lucide-react";
import { updateBusinessSettingsAction } from "@/lib/actions/business-settings";
import type { BusinessSettings } from "@/lib/business-settings";

export function DualFormatPrintingPanel({ settings }: { settings: BusinessSettings }) {
  const [enabled, setEnabled] = useState(settings.dualFormatPrintingEnabled);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="rounded-xl border border-zinc-200 p-4">
      <div className="flex items-start gap-2.5">
        <Printer className="mt-0.5 h-5 w-5 shrink-0 text-zindo-green-600" />
        <div>
          <p className="font-bold text-zinc-900">Choisir le format d&apos;impression</p>
          <p className="mt-1 text-sm text-zinc-500">
            Après une vente, un bouton « Imprimer en A4 » (ou « Imprimer en ticket ») s&apos;ajoute sur la page de la
            vente. Les deux impressions portent le même numéro et les mêmes montants — c&apos;est la même vente,
            imprimée deux fois. Rien n&apos;est enregistré en double, ni dans le stock, ni dans vos rapports.
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-zinc-100 p-3">
        <div>
          <p className="text-sm font-medium text-zinc-900">Imprimer en A4 ou en thermique au choix</p>
          <p className="text-xs text-zinc-500">Le second format est proposé après la vente et sur la page Ventes.</p>
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
              const result = await updateBusinessSettingsAction({ dualFormatPrintingEnabled: v });
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
