"use client";

import { Lock } from "lucide-react";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { adminForceCloseSessionAction } from "@/lib/actions/admin-cash-sessions";

export function ForceCloseSessionButton({
  businessId,
  sessionId,
  locationName,
}: {
  businessId: string;
  sessionId: string;
  locationName: string;
}) {
  return (
    <ConfirmButton
      variant="secondary"
      label={
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100">
          <Lock className="h-3.5 w-3.5" /> Clôturer de force
        </span>
      }
      confirmTitle="Clôturer cette session de caisse"
      confirmMessage={`Cette session bloque probablement toutes les ventes de "${locationName}" (une seule session peut être ouverte à la fois). Elle sera clôturée sur le montant attendu (aucun écart signalé) — le commerçant pourra faire son propre inventaire ensuite. À utiliser seulement quand l'employé concerné n'est plus joignable pour clôturer normalement.`}
      action={() => adminForceCloseSessionAction(businessId, sessionId)}
    />
  );
}
