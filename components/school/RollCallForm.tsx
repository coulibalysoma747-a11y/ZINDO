"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ATTENDANCE_STATUSES, type AttendanceStatus } from "@/lib/school-constants";
import { useResettingAction } from "@/components/school/useResettingAction";

type Row = { id: string; name: string; status: AttendanceStatus | null; note: string | null };
type State = { error?: string; success?: string } | undefined;

const TONES: Record<AttendanceStatus, string> = {
  PRESENT: "bg-emerald-600 text-white",
  ABSENT: "bg-red-600 text-white",
  RETARD: "bg-amber-500 text-white",
  JUSTIFIE: "bg-blue-600 text-white",
};
const SHORT: Record<AttendanceStatus, string> = { PRESENT: "P", ABSENT: "A", RETARD: "R", JUSTIFIE: "J" };

/**
 * Feuille d'appel : un bouton par statut et par personne (élèves ou
 * enseignants). Tout le monde est « Présent » par défaut, il suffit de
 * toucher les absents et les retards.
 */
export function RollCallForm({
  rows,
  hidden,
  action,
}: {
  rows: Row[];
  hidden: Record<string, string>;
  action: (prev: State, fd: FormData) => Promise<State>;
}) {
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>(() =>
    Object.fromEntries(rows.map((r) => [r.id, r.status ?? "PRESENT"]))
  );
  const [state, formAction, pending] = useResettingAction(action);
  const counts = Object.values(statuses).reduce<Record<string, number>>((acc, s) => ({ ...acc, [s]: (acc[s] ?? 0) + 1 }), {});

  return (
    <form action={formAction} className="space-y-3">
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <p className="text-sm text-zinc-500">
        {(Object.keys(ATTENDANCE_STATUSES) as AttendanceStatus[]).map((s) => `${ATTENDANCE_STATUSES[s]} : ${counts[s] ?? 0}`).join(" · ")}
      </p>
      <Card className="divide-y divide-zinc-100">
        {rows.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
            <input type="hidden" name={`status_${r.id}`} value={statuses[r.id]} />
            <span className="text-sm font-medium text-zinc-900">{r.name}</span>
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {(Object.keys(ATTENDANCE_STATUSES) as AttendanceStatus[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    title={ATTENDANCE_STATUSES[s]}
                    onClick={() => setStatuses((prev) => ({ ...prev, [r.id]: s }))}
                    className={`h-9 w-9 rounded-lg text-sm font-semibold ${statuses[r.id] === s ? TONES[s] : "bg-zinc-100 text-zinc-500 dark:bg-slate-800"}`}
                  >
                    {SHORT[s]}
                  </button>
                ))}
              </div>
              {statuses[r.id] !== "PRESENT" && (
                <input
                  name={`note_${r.id}`}
                  defaultValue={r.note ?? ""}
                  placeholder="Motif"
                  className="w-28 rounded-lg border border-zinc-200 px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900"
                />
              )}
            </div>
          </div>
        ))}
      </Card>
      <p className="text-xs text-zinc-400">P = présent · A = absent · R = retard · J = absence justifiée</p>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.success && <p className="text-sm text-emerald-600">{state.success}</p>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Enregistrement..." : "Enregistrer l'appel"}
      </Button>
    </form>
  );
}
