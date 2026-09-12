"use client";

import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { validateInventoryAction } from "@/lib/actions/inventory";

export function ValidateInventoryButton({
  inventoryId,
  discrepancyCount,
}: {
  inventoryId: string;
  discrepancyCount: number;
}) {
  const router = useRouter();
  return (
    <ConfirmButton
      variant="secondary"
      label={
        <span className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
          <CheckCircle2 className="h-4 w-4" /> Valider la correction
        </span>
      }
      confirmTitle="Valider l'inventaire"
      confirmMessage={
        discrepancyCount > 0
          ? `${discrepancyCount} produit(s) présentent un écart. Le stock sera corrigé automatiquement pour correspondre au comptage réel.`
          : "Aucun écart détecté. Confirmer la validation de cet inventaire ?"
      }
      action={() => validateInventoryAction(inventoryId)}
      onDone={() => router.refresh()}
    />
  );
}
