"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { deleteExpenseAction } from "@/lib/actions/expenses";

export function DeleteExpenseButton({ id, label }: { id: string; label: string }) {
  const router = useRouter();
  return (
    <ConfirmButton
      label={<Trash2 className="h-4 w-4" />}
      className="rounded-lg p-1.5 text-red-500 hover:bg-red-50"
      confirmTitle="Supprimer la dépense"
      confirmMessage={`Voulez-vous vraiment supprimer "${label}" ?`}
      action={() => deleteExpenseAction(id)}
      onDone={() => router.refresh()}
    />
  );
}
