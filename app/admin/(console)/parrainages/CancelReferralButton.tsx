"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelReferralAction } from "@/lib/actions/referral-admin";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";

export function CancelReferralButton({ referralId }: { referralId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
        Annuler
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Annuler ce parrainage">
        <p className="mb-3 text-sm text-zinc-600">
          Si la récompense a déjà été accordée, le mois offert sera retiré de l&apos;abonnement du parrain.
        </p>
        <Field label="Raison" htmlFor="cancel-reason">
          <Input id="cancel-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex. faux compte" />
        </Field>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Fermer
          </Button>
          <Button
            variant="danger"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const res = await cancelReferralAction(referralId, reason);
                if (res.error) return setError(res.error);
                setOpen(false);
                router.refresh();
              })
            }
          >
            Confirmer l&apos;annulation
          </Button>
        </div>
      </Modal>
    </>
  );
}
