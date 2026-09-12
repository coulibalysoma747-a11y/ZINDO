"use client";

import { useRouter } from "next/navigation";
import { Ban } from "lucide-react";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { cancelSaleAction } from "@/lib/actions/sales";

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
      action={() => cancelSaleAction(saleId)}
      onDone={() => router.refresh()}
    />
  );
}
