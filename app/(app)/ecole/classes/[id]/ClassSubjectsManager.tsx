"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { Field, Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { saveClassSubjectAction, deleteClassSubjectAction, setMainTeacherAction } from "@/lib/actions/school-staff";
import { useResettingAction } from "@/components/school/useResettingAction";

type ClassSubject = { id: string; subjectId: string; name: string; coefficient: number; teacherId: string | null; teacherName: string | null };

export function ClassSubjectsManager({
  classId,
  mainTeacherId,
  classSubjects,
  subjects,
  teachers,
}: {
  classId: string;
  mainTeacherId: string | null;
  classSubjects: ClassSubject[];
  subjects: { id: string; name: string }[];
  teachers: { id: string; name: string }[];
}) {
  const [editing, setEditing] = useState<ClassSubject | null>(null);
  const [state, formAction, pending] = useResettingAction(saveClassSubjectAction, () => setEditing(null));
  const [mainMsg, setMainMsg] = useState<string | undefined>();
  const [savingMain, startMain] = useTransition();

  return (
    <div className="space-y-5">
      <Field label="Professeur principal" htmlFor="mainTeacher">
        <Select
          id="mainTeacher"
          defaultValue={mainTeacherId ?? ""}
          disabled={savingMain}
          onChange={(e) =>
            startMain(async () => {
              const res = await setMainTeacherAction(classId, e.target.value || null);
              setMainMsg(res?.error ?? res?.success);
            })
          }
        >
          <option value="">Aucun</option>
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </Select>
      </Field>
      {mainMsg && <p className="-mt-3 text-xs text-zinc-500">{mainMsg}</p>}

      <div>
        <h2 className="mb-2 font-semibold text-zinc-900">Matières, coefficients et enseignants</h2>
        {subjects.length === 0 ? (
          <p className="text-sm text-zinc-500">
            Créez d&apos;abord vos matières dans{" "}
            <Link href="/ecole/matieres" className="underline">
              Matières
            </Link>
            .
          </p>
        ) : (
          <form key={`${state?.n ?? 0}-${editing?.id ?? "new"}`} action={formAction} className="grid gap-3 sm:grid-cols-4 sm:items-end">
            <input type="hidden" name="classId" value={classId} />
            <Field label="Matière" htmlFor="subjectId">
              <Select id="subjectId" name="subjectId" defaultValue={editing?.subjectId ?? ""} required>
                <option value="">Choisir…</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Coefficient" htmlFor="coefficient">
              <Input id="coefficient" name="coefficient" type="number" min={0.5} max={20} step="0.5" defaultValue={editing?.coefficient ?? 1} required />
            </Field>
            <Field label="Enseignant" htmlFor="teacherId">
              <Select id="teacherId" name="teacherId" defaultValue={editing?.teacherId ?? ""}>
                <option value="">Aucun</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Button type="submit" disabled={pending}>
              {editing ? "Enregistrer" : "Ajouter"}
            </Button>
          </form>
        )}
        {state?.error && <p className="mt-2 text-sm text-red-600">{state.error}</p>}
        {state?.success && <p className="mt-2 text-sm text-emerald-600">{state.success}</p>}
      </div>

      {classSubjects.length > 0 && (
        <div className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 dark:border-slate-800">
          {classSubjects.map((cs) => (
            <div key={cs.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
              <button type="button" onClick={() => setEditing(cs)} className="text-left hover:underline">
                <span className="font-medium text-zinc-900">{cs.name}</span>
                <span className="text-zinc-500">
                  {" "}
                  · coef. {cs.coefficient} · {cs.teacherName ?? "sans enseignant"}
                </span>
              </button>
              <ConfirmButton
                label={<Trash2 className="h-4 w-4" />}
                className="text-zinc-400 hover:text-red-600"
                confirmTitle="Retirer la matière"
                confirmMessage={`Retirer ${cs.name} de cette classe ?`}
                action={() => deleteClassSubjectAction(cs.id, classId)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
