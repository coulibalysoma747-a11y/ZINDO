"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Field, Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { deleteBusinessAction } from "@/lib/actions/super-admin";

export function DeleteBusinessButton({ businessId, businessName }: { businessId: string; businessName: string }) {
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
        className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
      >
        <Trash2 className="h-4 w-4" /> Supprimer ce commerce
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={`Supprimer ${businessName}`}>
        <p className="text-sm text-zinc-600">
          Cette action est <span className="font-semibold text-red-600">définitive et irréversible</span> : tous
          les produits, ventes, achats, clients, utilisateurs et données liées à ce commerce seront supprimés.
          Confirmez avec votre propre mot de passe (compte fondateur).
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
                const result = await deleteBusinessAction(businessId, password);
                if (result.error) {
                  setError(result.error);
                  return;
                }
                router.push("/admin/commercants");
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
