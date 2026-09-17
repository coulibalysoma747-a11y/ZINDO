"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { returnRentalAction, cancelRentalAction } from "@/lib/actions/rentals";

export function RentalActions({ rentalId }: { rentalId: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div className="flex items-center gap-1.5">
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await returnRentalAction(rentalId);
            router.refresh();
          })
        }
      >
        <Check className="h-3.5 w-3.5" /> Retournée
      </Button>
      <Button
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() => {
          if (!confirm("Annuler cette location ?")) return;
          startTransition(async () => {
            await cancelRentalAction(rentalId);
            router.refresh();
          });
        }}
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
