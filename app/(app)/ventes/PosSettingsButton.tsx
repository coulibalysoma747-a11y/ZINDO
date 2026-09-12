"use client";

import { useState, useTransition } from "react";
import { Settings } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { setPosSettingsAction } from "@/lib/actions/preferences";

export function PosSettingsButton({
  autoPrintReceipt,
  printerTicketWidth,
  onAutoPrintChange,
}: {
  autoPrintReceipt: boolean;
  printerTicketWidth: string | null;
  onAutoPrintChange: (value: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !autoPrintReceipt;
    onAutoPrintChange(next);
    startTransition(async () => {
      await setPosSettingsAction({ autoPrintReceipt: next, printerTicketWidth });
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Paramètres de la caisse"
        title="Paramètres de la caisse"
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-slate-700 dark:hover:bg-slate-800"
      >
        <Settings className="h-4 w-4" />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Paramètres de la caisse">
        <label className="flex items-start gap-3 rounded-lg border border-zinc-200 p-3 dark:border-slate-700">
          <input
            type="checkbox"
            checked={autoPrintReceipt}
            disabled={pending}
            onChange={toggle}
            className="mt-0.5 h-4 w-4 rounded accent-zindo-orange-500"
          />
          <span>
            <span className="block text-sm font-medium text-zinc-900">
              Imprimer automatiquement le ticket après chaque vente
            </span>
            <span className="mt-0.5 block text-xs text-zinc-500">
              Désactivé par défaut. Une fois activé, le ticket se lance à l&apos;impression dès qu&apos;une
              vente est validée, sans action supplémentaire.
            </span>
          </span>
        </label>
      </Modal>
    </>
  );
}
