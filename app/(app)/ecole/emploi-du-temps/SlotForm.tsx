"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Field, Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { WEEKDAYS } from "@/lib/school-constants";
import { saveTimetableSlotAction, deleteTimetableSlotAction } from "@/lib/actions/school-teaching";
import { useResettingAction } from "@/components/school/useResettingAction";

export function SlotForm({
  classId,
  subjects,
  teachers,
}: {
  classId: string;
  subjects: { id: string; name: string; teacherId: string | null }[];
  teachers: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useResettingAction(saveTimetableSlotAction);
  // Le jour et les heures restent d'un ajout à l'autre : on saisit une journée d'affilée.
  const [weekday, setWeekday] = useState("1");
  const [subjectId, setSubjectId] = useState("");
  const [teacherId, setTeacherId] = useState("");

  return (
    <Card>
      <CardBody>
        <h2 className="mb-3 font-semibold text-zinc-900">Ajouter un cours</h2>
        <form action={formAction} className="grid gap-3 sm:grid-cols-3">
          <input type="hidden" name="classId" value={classId} />
          <Field label="Jour" htmlFor="weekday">
            <Select id="weekday" name="weekday" value={weekday} onChange={(e) => setWeekday(e.target.value)}>
              {[1, 2, 3, 4, 5, 6].map((d) => (
                <option key={d} value={d}>
                  {WEEKDAYS[d]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Début" htmlFor="startTime">
            <Input id="startTime" name="startTime" type="time" defaultValue="07:30" required />
          </Field>
          <Field label="Fin" htmlFor="endTime">
            <Input id="endTime" name="endTime" type="time" defaultValue="09:30" required />
          </Field>
          <Field label="Matière" htmlFor="subjectId">
            <Select
              id="subjectId"
              name="subjectId"
              value={subjectId}
              onChange={(e) => {
                setSubjectId(e.target.value);
                // L'enseignant de la matière dans cette classe est proposé d'office.
                const t = subjects.find((s) => s.id === e.target.value)?.teacherId;
                if (t) setTeacherId(t);
              }}
            >
              <option value="">Autre (récréation, sport…)</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Enseignant" htmlFor="teacherId">
            <Select id="teacherId" name="teacherId" value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
              <option value="">Aucun</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Salle (facultatif)" htmlFor="room">
            <Input id="room" name="room" />
          </Field>
          <div className="sm:col-span-3">
            {state?.error && <p className="mb-2 text-sm text-red-600">{state.error}</p>}
            {state?.success && <p className="mb-2 text-sm text-emerald-600">{state.success}</p>}
            <Button type="submit" disabled={pending}>
              {pending ? "Ajout..." : "Ajouter le cours"}
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}

export function DeleteSlotButton({ id }: { id: string }) {
  return (
    <ConfirmButton
      label={<Trash2 className="h-3.5 w-3.5" />}
      className="text-zinc-400 hover:text-red-600 print:hidden"
      confirmTitle="Supprimer le cours"
      confirmMessage="Retirer ce cours de l'emploi du temps ?"
      action={() => deleteTimetableSlotAction(id)}
    />
  );
}
