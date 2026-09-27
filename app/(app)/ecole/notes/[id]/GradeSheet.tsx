"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lock, Unlock, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { saveGradesAction, setEvaluationLockedAction, deleteEvaluationAction, type ActionState, type Evaluation } from "@/lib/actions/school-grades";

type Row = { studentId: string; name: string; score: number | null; absent: boolean };

export function GradeSheet({ evaluation: e, rows, isManager }: { evaluation: Evaluation; rows: Row[]; isManager: boolean }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<ActionState, FormData>(saveGradesAction, undefined);
  const [absent, setAbsent] = useState<Record<string, boolean>>(() => Object.fromEntries(rows.map((r) => [r.studentId, r.absent])));
  const [lockMsg, setLockMsg] = useState<string | undefined>();
  const [locking, startLock] = useTransition();

  const toggleLock = () =>
    startLock(async () => {
      const res = await setEvaluationLockedAction(e.id, !e.locked);
      setLockMsg(res?.error ?? res?.success);
      router.refresh();
    });

  const graded = rows.filter((r) => r.score !== null);
  const avg = graded.length ? graded.reduce((s, r) => s + (r.score ?? 0), 0) / graded.length : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-zinc-500">
          {graded.length} / {rows.length} notés{avg !== null ? ` · moyenne ${avg.toFixed(2).replace(".", ",")} / ${e.maxScore}` : ""}
        </p>
        <div className="flex items-center gap-2">
          {(isManager || !e.locked) && (
            <Button type="button" variant="secondary" onClick={toggleLock} disabled={locking}>
              {e.locked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
              {e.locked ? "Déverrouiller" : "Verrouiller les notes"}
            </Button>
          )}
          {!e.locked && (isManager || e.gradedCount === 0) && (
            <ConfirmButton
              label={<Trash2 className="h-4 w-4" />}
              className="p-2 text-zinc-400 hover:text-red-600"
              confirmTitle="Supprimer l'évaluation"
              confirmMessage={`Supprimer « ${e.title} » et toutes ses notes ?`}
              action={() => deleteEvaluationAction(e.id)}
              onDone={() => router.push(`/ecole/notes?classe=${e.classId}&trimestre=${e.term}`)}
            />
          )}
        </div>
      </div>
      {lockMsg && <p className="text-sm text-zinc-600">{lockMsg}</p>}
      {e.locked && <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">Notes verrouillées : elles ne peuvent plus être modifiées.</p>}

      <form action={formAction} className="space-y-3">
        <input type="hidden" name="evaluationId" value={e.id} />
        <Card className="divide-y divide-zinc-100">
          {rows.map((r, i) => (
            <div key={r.studentId} className="flex items-center justify-between gap-3 px-4 py-2">
              <span className="text-sm font-medium text-zinc-900">
                <span className="mr-2 text-xs text-zinc-400">{i + 1}.</span>
                {r.name}
              </span>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1 text-xs text-zinc-500">
                  <input
                    type="checkbox"
                    name={`absent_${r.studentId}`}
                    defaultChecked={r.absent}
                    disabled={e.locked}
                    onChange={(ev) => setAbsent((prev) => ({ ...prev, [r.studentId]: ev.target.checked }))}
                  />
                  Absent
                </label>
                <input
                  name={`score_${r.studentId}`}
                  inputMode="decimal"
                  defaultValue={r.score ?? ""}
                  disabled={e.locked || absent[r.studentId]}
                  placeholder={`/ ${e.maxScore}`}
                  aria-label={`Note de ${r.name}`}
                  onFocus={(ev) => ev.target.select()}
                  className="w-20 rounded-lg border border-zinc-200 px-2 py-1.5 text-right text-sm disabled:bg-zinc-50 dark:border-slate-700 dark:bg-slate-900"
                />
              </div>
            </div>
          ))}
        </Card>
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state?.success && <p className="text-sm text-emerald-600">{state.success}</p>}
        {!e.locked && (
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Enregistrement..." : "Enregistrer les notes"}
          </Button>
        )}
      </form>
    </div>
  );
}
