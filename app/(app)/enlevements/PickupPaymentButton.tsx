"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Wallet } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Field, Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { recordPickupPaymentAction } from "@/lib/actions/pickups";

export function PickupPaymentButton({ pickupId, remaining }: { pickupId: string; remaining: number }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(String(remaining));
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Enregistrer un paiement"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 hover:border-zindo-green-300 hover:bg-zindo-green-50 hover:text-zindo-green-700"
      >
        <Wallet className="h-4 w-4" />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Enregistrer un paiement">
        <div className="space-y-3">
          <Field label="Montant reçu" htmlFor="pickupPaymentAmount">
            <Input
              id="pickupPaymentAmount"
              type="number"
              min={0}
              max={remaining}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </Field>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button
            type="button"
            disabled={pending}
            className="w-full"
            onClick={() =>
              startTransition(async () => {
                const result = await recordPickupPaymentAction(pickupId, Number(amount) || 0);
                if (result.error) {
                  setError(result.error);
                  return;
                }
                setOpen(false);
                router.refresh();
              })
            }
          >
            {pending ? "Enregistrement..." : "Confirmer"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
