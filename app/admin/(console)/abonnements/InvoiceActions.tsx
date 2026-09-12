"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { confirmInvoicePaymentAction, cancelInvoiceAction } from "@/lib/actions/subscription-admin";

export function InvoiceActions({ invoiceId }: { invoiceId: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div className="flex shrink-0 gap-2">
      <Button
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await confirmInvoicePaymentAction(invoiceId);
            router.refresh();
          })
        }
      >
        <Check className="h-3.5 w-3.5" /> Confirmer
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await cancelInvoiceAction(invoiceId);
            router.refresh();
          })
        }
      >
        <X className="h-3.5 w-3.5" /> Annuler
      </Button>
    </div>
  );
}
