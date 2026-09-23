"use client";

import { useRouter } from "next/navigation";
import { Ban } from "lucide-react";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { cancelSaleAction } from "@/lib/actions/sales";
import { CANCEL_REASON_REQUIRED } from "@/lib/sale-rules-constants";

export function CancelSaleButton({ saleId }: { saleId: string }) {
  const router = useRouter();
  return (
    <ConfirmButton
      label={
        <span className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50">
          <Ban className="h-4 w-4" /> Annuler la vente
        </span>
      }
      confirmTitle="Annuler cette vente"
      confirmMessage="Le stock des produits vendus sera réintégré. Cette action est enregistrée dans l'historique."
      action={async () => {
        const result = await cancelSaleAction(saleId);
        if (result?.error !== CANCEL_REASON_REQUIRED) return result;
        const reason = window.prompt("Motif de l'annulation :");
        if (!reason?.trim()) return { error: "Le motif est obligatoire pour annuler une vente." };
        return cancelSaleAction(saleId, reason);
      }}
      onDone={() => router.refresh()}
    />
  );
}
