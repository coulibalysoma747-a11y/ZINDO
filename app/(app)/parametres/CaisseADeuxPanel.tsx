"use client";

import { useState, useTransition } from "react";
import { Users } from "lucide-react";
import { updateBusinessSettingsAction } from "@/lib/actions/business-settings";
import type { BusinessSettings } from "@/lib/business-settings";

export function CaisseADeuxPanel({ settings }: { settings: BusinessSettings }) {
  const [enabled, setEnabled] = useState(settings.cashierQueueEnabled);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="rounded-xl border border-zinc-200 p-4">
      <div className="flex items-start gap-2.5">
        <Users className="mt-0.5 h-5 w-5 shrink-0 text-zindo-green-600" />
        <div>
          <p className="font-bold text-zinc-900">Caisse à deux</p>
          <p className="mt-1 text-sm text-zinc-500">
            Un vendeur prépare le panier d&apos;un client et l&apos;envoie dans une file d&apos;attente («&nbsp;Envoyer
            à la caisse&nbsp;») sans encaisser. Un caissier récupère ensuite le panier depuis cette file et finalise
            le paiement. Le stock n&apos;est déduit qu&apos;au moment du paiement.
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-zinc-100 p-3">
        <div>
          <p className="text-sm font-medium text-zinc-900">Activer la file d&apos;attente caisse</p>
          <p className="text-xs text-zinc-500">
            Ajoute les boutons « Envoyer à la caisse » et « File d&apos;attente » sur l&apos;écran de vente.
          </p>
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
              const result = await updateBusinessSettingsAction({ cashierQueueEnabled: v });
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
