"use client";

import { useActionState } from "react";
import { Field, Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { createEvaluationAction, type ActionState } from "@/lib/actions/school-grades";
import { EVALUATION_KINDS } from "@/lib/school-constants";

export function NewEvaluationForm({ classId, term, subjects }: { classId: string; term: number; subjects: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(createEvaluationAction, undefined);
  return (
    <Card>
      <CardBody>
        <h2 className="mb-3 font-semibold text-zinc-900">Nouvelle évaluation</h2>
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="classId" value={classId} />
          <input type="hidden" name="term" value={term} />
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Matière" htmlFor="subjectId">
              <Select id="subjectId" name="subjectId" required>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Type" htmlFor="kind">
              <Select id="kind" name="kind" defaultValue="DEVOIR">
                {Object.entries(EVALUATION_KINDS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Date" htmlFor="day">
              <Input id="day" name="day" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
            </Field>
            <Field label="Nom" htmlFor="title">
              <Input id="title" name="title" placeholder="Ex. Devoir n°1" required />
            </Field>
            <Field label="Noté sur" htmlFor="maxScore">
              <Input id="maxScore" name="maxScore" type="number" min={1} step="1" defaultValue={20} required />
            </Field>
            <Field label="Poids dans la moyenne" htmlFor="weight" hint="Ex. 2 pour une composition qui compte double.">
              <Input id="weight" name="weight" type="number" min={0.5} step="0.5" defaultValue={1} required />
            </Field>
          </div>
          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
          <Button type="submit" disabled={pending}>
            {pending ? "Création..." : "Créer et saisir les notes"}
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}
