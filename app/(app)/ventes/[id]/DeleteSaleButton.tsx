"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { deleteCancelledSaleAction } from "@/lib/actions/sales";

/** Suppression définitive d'une vente annulée (flag alerte_vente_annulee). */
export function DeleteSaleButton({ saleId }: { saleId: string }) {
  const router = useRouter();
  return (
    <ConfirmButton
      label={
        <span className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50">
          <Trash2 className="h-4 w-4" /> Supprimer la vente
        </span>
      }
      confirmTitle="Supprimer définitivement cette vente"
      confirmMessage="La vente annulée disparaîtra de l'historique. Le stock n'est pas modifié (il a déjà été réintégré à l'annulation). Cette action est irréversible et enregistrée dans le journal."
      action={() => deleteCancelledSaleAction(saleId)}
      onDone={() => router.push("/ventes/historique")}
    />
  );
}
