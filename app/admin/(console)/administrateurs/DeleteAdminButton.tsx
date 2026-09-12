"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Field, Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { deleteAdminAction } from "@/lib/actions/admin-management";

export function DeleteAdminButton({ adminId, adminName }: { adminId: string; adminName: string }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
      >
        <Trash2 className="h-3.5 w-3.5" /> Supprimer
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={`Supprimer ${adminName}`}>
        <p className="text-sm text-zinc-600">
          Ce compte administrateur n&apos;aura plus accès à la console ZINDO. Confirmez avec votre propre
          mot de passe (compte fondateur).
        </p>
        <div className="mt-4">
          <Field label="Votre mot de passe" htmlFor="confirmPassword">
            <Input
              id="confirmPassword"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
          </Field>
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button
            variant="danger"
            disabled={pending || password.length === 0}
            onClick={() =>
              startTransition(async () => {
                const result = await deleteAdminAction(adminId, password);
                if (result.error) {
                  setError(result.error);
                  return;
                }
                setOpen(false);
                setPassword("");
                router.refresh();
              })
            }
          >
            {pending ? "Suppression..." : "Confirmer la suppression"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
