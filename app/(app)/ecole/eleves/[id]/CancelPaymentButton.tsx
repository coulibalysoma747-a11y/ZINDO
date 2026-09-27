"use client";

import { Trash2 } from "lucide-react";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { deleteStudentPaymentAction } from "@/lib/actions/school";

export function CancelPaymentButton({ paymentId, studentId, label }: { paymentId: string; studentId: string; label: string }) {
  return (
    <ConfirmButton
      label={<Trash2 className="h-4 w-4" />}
      className="text-zinc-400 hover:text-red-600"
      confirmTitle="Annuler le paiement"
      confirmMessage={`Annuler le paiement ${label} ? Le montant sera de nouveau dû.`}
      action={() => deleteStudentPaymentAction(paymentId, studentId)}
    />
  );
}
