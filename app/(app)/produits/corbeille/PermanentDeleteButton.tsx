"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { deleteArchivedProductAction } from "@/lib/actions/products";

/** « Supprimer définitivement » dans la corbeille : confirmation, puis effacement immédiat (sans attendre les 30 jours). */
export function PermanentDeleteButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function confirm() {
    startTransition(async () => {
      const result = await deleteArchivedProductAction(id);
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
        className="rounded-lg border border-red-200 px-3 py-1.5 text-[12.5px] font-semibold text-red-700 transition-colors hover:bg-red-50"
      >
        Supprimer définitivement
      </button>
      <Modal open={open} onClose={() => !pending && setOpen(false)} title={`Effacer « ${name} » pour toujours ?`}>
        <p className="text-left text-sm leading-relaxed text-zinc-600">
          Le produit et son stock seront effacés définitivement. Cette action est irréversible. Si le produit a déjà servi dans une vente ou un achat, il ne
          peut pas être effacé : il reste alors dans la corbeille pour garder votre historique.
        </p>
        {error && <p className="mt-3 text-left text-sm text-red-600">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" disabled={pending} onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button disabled={pending} onClick={confirm} className="!bg-red-600 hover:!bg-red-700">
            {pending ? "Effacement…" : "Effacer définitivement"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
