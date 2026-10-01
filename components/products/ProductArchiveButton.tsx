"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { toggleProductActiveAction } from "@/lib/actions/products";

/**
 * « Supprimer » dans la liste des produits (interface pro) : demande confirmation
 * puis archive le produit — il va dans la corbeille s'il y en a une, et son
 * historique de ventes est conservé. Réutilise toggleProductActiveAction.
 */
export function ProductArchiveButton({ id, name, trash }: { id: string; name: string; trash: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function confirm() {
    startTransition(async () => {
      const res = await toggleProductActiveAction(id, false);
      if (res && "error" in res && res.error) {
        setError(res.error);
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
        {trash ? "Supprimer" : "Archiver"}
      </button>
      <Modal open={open} onClose={() => !pending && setOpen(false)} title={trash ? `Supprimer « ${name} » ?` : `Archiver « ${name} » ?`}>
        <p className="text-left text-sm leading-relaxed text-zinc-600">
          {trash
            ? "Le produit sera retiré de la liste et de la caisse. Ses ventes passées restent dans l'historique. Il reste dans la corbeille, d'où vous pouvez le restaurer à tout moment."
            : "Le produit sera retiré de la liste et de la caisse. Ses ventes passées restent dans l'historique. Vous pourrez le réactiver depuis sa fiche."}
        </p>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" disabled={pending} onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button disabled={pending} onClick={confirm} className="!bg-red-600 hover:!bg-red-700">
            {pending ? "En cours…" : trash ? "Supprimer" : "Archiver"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
