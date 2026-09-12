"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { createFeatureFlagAction, type ActionState } from "@/lib/actions/feature-flags";

export function CreateFeatureFlagForm() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [state, formAction, pending] = useActionState<ActionState, FormData>(createFeatureFlagAction, undefined);

  useEffect(() => {
    if (state?.success) {
      router.refresh();
      setOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Nouvelle fonctionnalité
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Enregistrer une nouvelle fonctionnalité">
        <form action={formAction} className="space-y-4">
          <Field
            label="Clé technique"
            htmlFor="key"
            hint="Minuscules, chiffres et underscores uniquement, ex. facture_a4"
          >
            <Input id="key" name="key" placeholder="ex_nouvelle_fonctionnalite" required autoFocus />
          </Field>
          <Field label="Nom" htmlFor="label">
            <Input id="label" name="label" placeholder="Ex : Facture A4" required />
          </Field>
          <Field label="Description (facultatif)" htmlFor="description">
            <Textarea id="description" name="description" rows={2} />
          </Field>
          <p className="text-xs text-zinc-500">
            Une fois créée, cette fonctionnalité reste invisible pour tous les commerçants jusqu&apos;à ce
            que vous l&apos;activiez ci-dessous.
          </p>
          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Création..." : "Créer"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
