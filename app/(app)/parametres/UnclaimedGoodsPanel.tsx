"use client";

import { useState, useTransition } from "react";
import { PackageX } from "lucide-react";
import { updateBusinessSettingsAction } from "@/lib/actions/business-settings";
import type { BusinessSettings } from "@/lib/business-settings";

export function UnclaimedGoodsPanel({ settings }: { settings: BusinessSettings }) {
  const [enabled, setEnabled] = useState(settings.trackUnclaimedGoods);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="rounded-xl border border-zinc-200 p-4">
      <div className="flex items-start gap-2.5">
        <PackageX className="mt-0.5 h-5 w-5 shrink-0 text-zindo-green-600" />
        <div>
          <p className="font-bold text-zinc-900">Marchandise payée non emportée</p>
          <p className="mt-1 text-sm text-zinc-500">
            Marquez qu&apos;un client a payé mais n&apos;a rien emporté (« il repasse ce soir ») depuis l&apos;historique des
            ventes. À savoir : ces articles sont déjà sortis du stock (ils sont vendus) tout en restant encore chez
            vous — rangez-les dans un coin « retraits » et ne les comptez pas à l&apos;inventaire.
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-zinc-100 p-3">
        <div>
          <p className="text-sm font-medium text-zinc-900">Suivre les marchandises à retirer</p>
          <p className="text-xs text-zinc-500">Le bouton « À retirer » est disponible sur chaque vente encaissée.</p>
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
              const result = await updateBusinessSettingsAction({ trackUnclaimedGoods: v });
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
