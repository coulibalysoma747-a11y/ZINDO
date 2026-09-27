"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { formatDate } from "@/lib/format";
import { HOMEWORK_KINDS } from "@/lib/school-constants";
import { saveHomeworkAction, deleteHomeworkAction, type Homework } from "@/lib/actions/school-teaching";
import { useResettingAction } from "@/components/school/useResettingAction";

export function HomeworkBoard({ classId, homework, subjects }: { classId: string; homework: Homework[]; subjects: { id: string; name: string }[] }) {
  const [editing, setEditing] = useState<Homework | null>(null);
  const [state, formAction, pending] = useResettingAction(saveHomeworkAction, () => setEditing(null));
  const [open, setOpen] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <Card>
        <CardBody>
          <h2 className="mb-3 font-semibold text-zinc-900">{editing ? "Modifier le devoir" : "Donner un devoir"}</h2>
          <form key={`${state?.n ?? 0}-${editing?.id ?? "new"}`} action={formAction} className="space-y-3">
            <input type="hidden" name="classId" value={classId} />
            {editing && <input type="hidden" name="id" value={editing.id} />}
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Matière" htmlFor="subjectId">
                <Select id="subjectId" name="subjectId" defaultValue={editing?.subjectId ?? subjects[0]?.id ?? ""}>
                  {subjects.length === 0 && <option value="">Toutes matières</option>}
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Type" htmlFor="kind">
                <Select id="kind" name="kind" defaultValue={editing?.kind ?? "DEVOIR"}>
                  {Object.entries(HOMEWORK_KINDS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="À rendre le" htmlFor="dueDate">
                <Input id="dueDate" name="dueDate" type="date" defaultValue={editing?.dueDate ?? ""} />
              </Field>
            </div>
            <Field label="Titre" htmlFor="title">
              <Input id="title" name="title" defaultValue={editing?.title} placeholder="Ex. Exercices 3 à 7 page 42" required />
            </Field>
            <Field label="Énoncé / questions" htmlFor="content">
              <Textarea id="content" name="content" rows={5} defaultValue={editing?.content ?? ""} placeholder={"1. …\n2. …\n3. …"} />
            </Field>
            {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
            {state?.success && <p className="text-sm text-emerald-600">{state.success}</p>}
            <div className="flex gap-2">
              <Button type="submit" disabled={pending}>
                {pending ? "Enregistrement..." : editing ? "Enregistrer" : "Publier le devoir"}
              </Button>
              {editing && (
                <Button type="button" variant="secondary" onClick={() => setEditing(null)}>
                  Annuler
                </Button>
              )}
            </div>
          </form>
        </CardBody>
      </Card>

      {homework.length === 0 ? (
        <p className="text-sm text-zinc-500">Aucun devoir pour cette classe.</p>
      ) : (
        <Card className="divide-y divide-zinc-100">
          {homework.map((h) => (
            <CardBody key={h.id} className="space-y-2 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <button type="button" onClick={() => setOpen(open === h.id ? null : h.id)} className="min-w-0 flex-1 text-left">
                  <p className="font-medium text-zinc-900">{h.title}</p>
                  <p className="text-xs text-zinc-500">
                    {HOMEWORK_KINDS[h.kind]} · {h.subjectName ?? "Toutes matières"} · donné le {formatDate(h.createdAt)}
                  </p>
                </button>
                <div className="flex items-center gap-3">
                  {h.dueDate && <Badge tone={h.dueDate < today ? "zinc" : "amber"}>À rendre le {formatDate(h.dueDate)}</Badge>}
                  <button type="button" onClick={() => setEditing(h)} className="text-zinc-400 hover:text-zinc-700" aria-label="Modifier">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <ConfirmButton
                    label={<Trash2 className="h-4 w-4" />}
                    className="text-zinc-400 hover:text-red-600"
                    confirmTitle="Supprimer le devoir"
                    confirmMessage={`Supprimer « ${h.title} » ?`}
                    action={() => deleteHomeworkAction(h.id)}
                  />
                </div>
              </div>
              {open === h.id && <p className="whitespace-pre-wrap text-sm text-zinc-700 dark:text-slate-300">{h.content || "Pas d'énoncé."}</p>}
            </CardBody>
          ))}
        </Card>
      )}
    </div>
  );
}
