"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Field, Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { saveReportNoteAction, type ActionState } from "@/lib/actions/school-grades";

export function ReportNoteForm({ studentId, term, appreciation, decision }: { studentId: string; term: number; appreciation: string; decision: string }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<ActionState, FormData>(async (prev, fd) => {
    const res = await saveReportNoteAction(prev, fd);
    if (res?.success) router.refresh();
    return res;
  }, undefined);
  return (
    <Card>
      <CardBody>
        <form action={formAction} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <input type="hidden" name="studentId" value={studentId} />
          <input type="hidden" name="term" value={term} />
          <Field label="Appréciation générale" htmlFor="appreciation" hint="Vide = appréciation automatique selon la moyenne.">
            <Input id="appreciation" name="appreciation" defaultValue={appreciation} placeholder="Bon trimestre, continuez ainsi" />
          </Field>
          <Field label="Décision du conseil" htmlFor="decision">
            <Input id="decision" name="decision" defaultValue={decision} placeholder="Tableau d'honneur, passe en classe supérieure…" />
          </Field>
          <Button type="submit" disabled={pending}>
            Enregistrer
          </Button>
        </form>
        {state?.error && <p className="mt-2 text-sm text-red-600">{state.error}</p>}
        {state?.success && <p className="mt-2 text-sm text-emerald-600">{state.success}</p>}
      </CardBody>
    </Card>
  );
}
