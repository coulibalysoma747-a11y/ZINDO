"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { deleteArchivedProductAction } from "@/lib/actions/products";

/**
 * « Supprimer définitivement » dans la corbeille : confirmation, puis effacement immédiat (sans attendre
 * les 30 jours). Si le produit a un historique, un message explique la conséquence et l'utilisateur
 * décide : « Supprimer quand même ».
 */
export function PermanentDeleteButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [pending, startTransition] = useTransition();

  function run(force: boolean) {
    startTransition(async () => {
      const result = await deleteArchivedProductAction(id, force);
      if (result.error) {
        setError(result.error);
        setBlocked(Boolean(result.blocked));
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
          setBlocked(false);
          setOpen(true);
        }}
        className="rounded-lg border border-red-200 px-3 py-1.5 text-[12.5px] font-semibold text-red-700 transition-colors hover:bg-red-50"
      >
        Supprimer définitivement
      </button>
      <Modal open={open} onClose={() => !pending && setOpen(false)} title={`Supprimer « ${name} » pour toujours ?`}>
        {blocked && error ? (
          <p className="text-left text-sm leading-relaxed text-zinc-700">{error}</p>
        ) : (
          <>
            <p className="text-left text-sm leading-relaxed text-zinc-600">
              Le produit et son stock seront supprimés définitivement. Cette action est irréversible.
            </p>
            {error && <p className="mt-3 text-left text-sm text-red-600">{error}</p>}
          </>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" disabled={pending} onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button disabled={pending} onClick={() => run(blocked)} className="!bg-red-600 hover:!bg-red-700">
            {pending ? "Suppression…" : blocked ? "Supprimer quand même" : "Supprimer définitivement"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
