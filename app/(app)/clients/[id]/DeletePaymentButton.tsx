"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { deleteCustomerPaymentAction } from "@/lib/actions/customers";

/** Supprimer un remboursement saisi par erreur (flag modifier_supprimer_partout). */
export function DeletePaymentButton({ customerId, paymentId, amountLabel }: { customerId: string; paymentId: string; amountLabel: string }) {
  const router = useRouter();
  return (
    <ConfirmButton
      label={<Trash2 className="h-4 w-4" />}
      className="inline-flex items-center rounded-lg p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
      confirmTitle="Supprimer le remboursement"
      confirmMessage={`Supprimer ce remboursement de ${amountLabel} ? La somme redevient due sur les ventes qu'il avait soldées.`}
      action={() => deleteCustomerPaymentAction(customerId, paymentId)}
      onDone={() => router.refresh()}
    />
  );
}
