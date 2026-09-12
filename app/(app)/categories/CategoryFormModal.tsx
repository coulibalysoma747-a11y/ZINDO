"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { createCategoryAction, updateCategoryAction } from "@/lib/actions/categories";

type Category = { id: string; name: string; description: string | null } | null;

export function CategoryFormModal({
  open,
  category,
  onClose,
}: {
  open: boolean;
  category: Category;
  onClose: () => void;
}) {
  const router = useRouter();
  const action = category
    ? updateCategoryAction.bind(null, category.id)
    : createCategoryAction;
  const [state, formAction, pending] = useActionState(action, undefined);

  useEffect(() => {
    if (state?.success) {
      router.refresh();
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Modal open={open} onClose={onClose} title={category ? "Modifier la catégorie" : "Nouvelle catégorie"}>
      <form action={formAction} className="space-y-4">
        <Field label="Nom" htmlFor="name">
          <Input id="name" name="name" defaultValue={category?.name} required autoFocus />
        </Field>
        <Field label="Description (facultatif)" htmlFor="description">
          <Textarea id="description" name="description" defaultValue={category?.description ?? ""} rows={2} />
        </Field>
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
