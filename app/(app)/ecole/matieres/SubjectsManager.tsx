"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { EmptyState } from "@/components/ui/Empty";
import { saveSubjectAction, deleteSubjectAction } from "@/lib/actions/school-staff";
import { useResettingAction } from "@/components/school/useResettingAction";

type Subject = { id: string; name: string; classCount: number };

export function SubjectsManager({ subjects }: { subjects: Subject[] }) {
  const [editing, setEditing] = useState<Subject | null>(null);
  const [state, formAction, pending] = useResettingAction(saveSubjectAction, () => setEditing(null));

  return (
    <div className="space-y-6">
      <Card>
        <CardBody>
          <form key={`${state?.n ?? 0}-${editing?.id ?? "new"}`} action={formAction} className="flex flex-wrap gap-2">
            {editing && <input type="hidden" name="id" value={editing.id} />}
            <Input name="name" placeholder="Ex. Mathématiques, Français, SVT" defaultValue={editing?.name} required className="min-w-0 flex-1" aria-label="Nom de la matière" />
            <Button type="submit" disabled={pending}>
              {editing ? "Enregistrer" : "Ajouter"}
            </Button>
            {editing && (
              <Button type="button" variant="secondary" onClick={() => setEditing(null)}>
                Annuler
              </Button>
            )}
          </form>
          {state?.error && <p className="mt-2 text-sm text-red-600">{state.error}</p>}
          {state?.success && <p className="mt-2 text-sm text-emerald-600">{state.success}</p>}
        </CardBody>
      </Card>

      {subjects.length === 0 ? (
        <EmptyState title="Aucune matière" description="Ajoutez les matières enseignées dans votre établissement." />
      ) : (
        <Card className="divide-y divide-zinc-100">
          {subjects.map((s) => (
            <CardBody key={s.id} className="flex items-center justify-between gap-3 py-3">
              <div>
                <p className="font-medium text-zinc-900">{s.name}</p>
                <p className="text-xs text-zinc-500">
                  Enseignée dans {s.classCount} classe{s.classCount > 1 ? "s" : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setEditing(s)} className="text-zinc-400 hover:text-zinc-700" aria-label="Modifier">
                  <Pencil className="h-4 w-4" />
                </button>
                <ConfirmButton
                  label={<Trash2 className="h-4 w-4" />}
                  className="text-zinc-400 hover:text-red-600"
                  confirmTitle="Supprimer la matière"
                  confirmMessage={`Supprimer « ${s.name} » de toutes les classes ?`}
                  action={() => deleteSubjectAction(s.id)}
                />
              </div>
            </CardBody>
          ))}
        </Card>
      )}
    </div>
  );
}
