"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

export function ConfirmButton({
  label,
  confirmTitle,
  confirmMessage,
  action,
  variant = "danger",
  className,
  onDone,
}: {
  label: React.ReactNode;
  confirmTitle: string;
  confirmMessage: string;
  action: () => Promise<{ error?: string; success?: string } | undefined>;
  variant?: "danger" | "secondary" | "outline";
  className?: string;
  onDone?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();

  return (
    <>
      <button onClick={() => setOpen(true)} className={className}>
        {label}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={confirmTitle}>
        <p className="text-sm text-zinc-600">{confirmMessage}</p>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button
            variant={variant}
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await action();
                if (result?.error) {
                  setError(result.error);
                } else {
                  setOpen(false);
                  onDone?.();
                }
              })
            }
          >
            {pending ? "Suppression..." : "Confirmer"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
