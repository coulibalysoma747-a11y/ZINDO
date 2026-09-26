"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { ConfirmButton } from "@/components/ui/ConfirmButton";

/** Bouton « Supprimer » avec confirmation, puis retour à la liste. */
export function DeleteRedirectButton({
  action,
  redirectTo,
  confirmTitle,
  confirmMessage,
  label = "Supprimer",
}: {
  action: () => Promise<{ error?: string; success?: string } | undefined>;
  redirectTo: string;
  confirmTitle: string;
  confirmMessage: string;
  label?: string;
}) {
  const router = useRouter();
  return (
    <ConfirmButton
      label={
        <>
          <Trash2 className="h-4 w-4" /> {label}
        </>
      }
      className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:hover:bg-red-900/20"
      confirmTitle={confirmTitle}
      confirmMessage={confirmMessage}
      action={action}
      onDone={() => {
        router.push(redirectTo);
        router.refresh();
      }}
    />
  );
}
