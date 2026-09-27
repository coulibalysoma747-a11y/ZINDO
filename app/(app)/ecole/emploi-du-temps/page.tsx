import { CalendarDays } from "lucide-react";
import { requireSchoolAccess, getAccessibleClasses, getClassSubjects } from "@/lib/school-access";
import { getTimetableAction, type TimetableSlot } from "@/lib/actions/school-teaching";
import { getTeachersAction } from "@/lib/actions/school-staff";
import { WEEKDAYS } from "@/lib/school-constants";
import { Card, CardBody } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/Empty";
import { PrintDocumentButton } from "@/components/purchase-orders/PrintDocumentButton";
import { FILTER_INPUT, FILTER_BUTTON } from "@/components/school/styles";
import { SlotForm, DeleteSlotButton } from "./SlotForm";

function Week({ slots, showClass, canEdit }: { slots: TimetableSlot[]; showClass: boolean; canEdit: boolean }) {
  const days = [1, 2, 3, 4, 5, 6].filter((d) => d <= 5 || slots.some((s) => s.weekday === d));
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-3">
      {days.map((d) => {
        const daySlots = slots.filter((s) => s.weekday === d);
        return (
          <Card key={d} className="print:break-inside-avoid">
            <CardBody className="space-y-2">
              <p className="font-semibold text-zinc-900">{WEEKDAYS[d]}</p>
              {daySlots.length === 0 ? (
                <p className="text-xs text-zinc-400">Pas de cours</p>
              ) : (
                daySlots.map((s) => (
                  <div key={s.id} className="flex items-start justify-between gap-2 rounded-lg bg-zinc-50 px-2.5 py-2 text-sm dark:bg-slate-800/60">
                    <div>
                      <p className="font-medium text-zinc-900">
                        {s.startTime}–{s.endTime} · {s.subjectName ?? "Cours"}
                      </p>
                      <p className="text-xs text-zinc-500">{[showClass ? s.className : s.teacherName, s.room ? `salle ${s.room}` : null].filter(Boolean).join(" · ") || "—"}</p>
                    </div>
                    {canEdit && <DeleteSlotButton id={s.id} />}
                  </div>
                ))
              )}
            </CardBody>
          </Card>
        );
      })}
    </div>
  );
}

export default async function TimetablePage({ searchParams }: { searchParams: Promise<{ classe?: string }> }) {
  const sp = await searchParams;
  const access = await requireSchoolAccess("teach");
  const classes = await getAccessibleClasses(access);
  // L'enseignant voit d'abord SON emploi du temps ; il peut aussi choisir une de ses classes.
  const classId = sp.classe && classes.some((c) => c.id === sp.classe) ? sp.classe : access.isManager ? classes[0]?.id : undefined;
  const [slots, subjects, teachers] = await Promise.all([
    getTimetableAction(classId),
    access.isManager && classId ? getClassSubjects(access, classId) : Promise.resolve([]),
    access.isManager ? getTeachersAction() : Promise.resolve([]),
  ]);
  const className = classes.find((c) => c.id === classId)?.name;

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-zinc-500" />
          <div>
            <h1 className="text-xl font-bold text-zinc-900">Emploi du temps{className ? ` — ${className}` : !access.isManager ? " — mes cours" : ""}</h1>
            <p className="text-sm text-zinc-500 print:hidden">Cours de la semaine par jour.</p>
          </div>
        </div>
        <div className="print:hidden">
          <PrintDocumentButton />
        </div>
      </div>

      {classes.length === 0 ? (
        <EmptyState title="Aucune classe" />
      ) : (
        <>
          <form className="flex flex-wrap gap-2 print:hidden">
            <select name="classe" defaultValue={classId ?? ""} className={FILTER_INPUT}>
              {!access.isManager && <option value="">Mes cours</option>}
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <button type="submit" className={FILTER_BUTTON}>
              Afficher
            </button>
          </form>

          {access.isManager && classId && (
            <div className="print:hidden">
              <SlotForm
                classId={classId}
                subjects={subjects.map((s) => ({ id: s.subjectId, name: s.name, teacherId: s.teacherId }))}
                teachers={teachers.filter((t) => t.active).map((t) => ({ id: t.id, name: `${t.lastName} ${t.firstName}` }))}
              />
            </div>
          )}

          <Week slots={slots} showClass={!classId} canEdit={access.isManager} />
        </>
      )}
    </div>
  );
}
