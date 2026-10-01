"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { deleteProductNowAction } from "@/lib/actions/products";

/**
 * « Supprimer » dans la liste des produits du vendeur du Marché (sans corbeille) : confirmation, puis suppression
 * immédiate. Si le produit a déjà été commandé, il disparaît quand même et ses anciennes commandes gardent son nom.
 */
export function ProductDeleteButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function confirm() {
    startTransition(async () => {
      const result = await deleteProductNowAction(id);
      if (result.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        className="inline-flex h-9 shrink-0 items-center rounded-lg border border-red-200 bg-white px-3 text-sm font-medium text-red-700 hover:bg-red-50"
      >
        Supprimer
      </button>
      <Modal open={open} onClose={() => !pending && setOpen(false)} title={`Supprimer « ${name} » ?`}>
        <p className="text-left text-sm leading-relaxed text-zinc-600">
          Le produit disparaît de votre liste et du Marché. Cette action est irréversible. S&apos;il a déjà été commandé, ses anciennes commandes gardent son nom.
        </p>
        {error && <p className="mt-3 text-left text-sm text-red-600">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" disabled={pending} onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button disabled={pending} onClick={confirm} className="!bg-red-600 hover:!bg-red-700">
            {pending ? "Suppression…" : "Supprimer"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
