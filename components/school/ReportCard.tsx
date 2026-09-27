/* eslint-disable @next/next/no-img-element -- document imprimé : <img> garantit le rendu à l'impression/PDF. */
import type { StudentReport } from "@/lib/school-report";
import { currentSchoolYear, termLabel, formatAverage, gradeAppreciation } from "@/lib/school-constants";

/** Bulletin scolaire d'un élève pour un trimestre, en noir et blanc pour l'impression. */
export function ReportCard({
  school,
  className,
  mainTeacher,
  studentCount,
  classAverage,
  best,
  worst,
  student,
  term,
  attendance,
  note,
}: {
  school: { name: string; logoUrl: string | null; address: string | null; city: string | null; phone: string | null };
  className: string;
  mainTeacher: string | null;
  studentCount: number;
  classAverage: number | null;
  best: number | null;
  worst: number | null;
  student: StudentReport;
  term: number;
  attendance: { absences: number; justified: number; retards: number };
  note?: { appreciation: string | null; decision: string | null };
}) {
  const totalCoef = student.subjects.filter((s) => s.average !== null).reduce((sum, s) => sum + s.coefficient, 0);
  const totalPoints = student.subjects.reduce((sum, s) => sum + (s.average ?? 0) * (s.average !== null ? s.coefficient : 0), 0);

  return (
    <div className="space-y-4 rounded-xl border border-zinc-300 bg-white p-6 text-[13px] text-black print:break-after-page print:rounded-none print:border-0 print:p-0">
      <div className="flex items-start justify-between gap-4 border-b border-zinc-400 pb-3">
        <div className="flex items-center gap-3">
          {school.logoUrl && <img src={school.logoUrl} alt="" className="h-14 w-14 object-contain" />}
          <div>
            <p className="text-base font-bold">{school.name}</p>
            {(school.address || school.city) && <p>{[school.address, school.city].filter(Boolean).join(", ")}</p>}
            {school.phone && <p>Tél. {school.phone}</p>}
          </div>
        </div>
        <div className="text-right">
          <p className="text-base font-bold">BULLETIN DE NOTES</p>
          <p>{termLabel(term)}</p>
          <p>Année scolaire {currentSchoolYear()}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-1">
        <p>
          Élève : <strong>{student.name}</strong>
        </p>
        <p>Matricule : {student.matricule ?? "—"}</p>
        <p>
          Classe : <strong>{className}</strong> ({studentCount} élèves)
        </p>
        <p>Professeur principal : {mainTeacher ?? "—"}</p>
      </div>

      <table className="w-full border-collapse">
        <thead>
          <tr className="border-y border-zinc-500 text-left">
            <th className="py-1.5 pr-2">Matière</th>
            <th className="py-1.5 pr-2 text-right">Moy. /20</th>
            <th className="py-1.5 pr-2 text-right">Coef.</th>
            <th className="py-1.5 pr-2 text-right">Points</th>
            <th className="py-1.5 pr-2 text-right">Moy. classe</th>
            <th className="py-1.5 pr-2 text-right">Rang</th>
            <th className="py-1.5">Appréciation</th>
          </tr>
        </thead>
        <tbody>
          {student.subjects.map((s) => (
            <tr key={s.subjectId} className="border-b border-zinc-200">
              <td className="py-1.5 pr-2">
                {s.name}
                {s.teacherName && <span className="block text-[11px] text-zinc-500">{s.teacherName}</span>}
              </td>
              <td className="py-1.5 pr-2 text-right font-semibold">{formatAverage(s.average)}</td>
              <td className="py-1.5 pr-2 text-right">{s.coefficient}</td>
              <td className="py-1.5 pr-2 text-right">{s.average !== null ? formatAverage(s.average * s.coefficient) : "—"}</td>
              <td className="py-1.5 pr-2 text-right">{formatAverage(s.classAverage)}</td>
              <td className="py-1.5 pr-2 text-right">{s.rank ?? "—"}</td>
              <td className="py-1.5">{gradeAppreciation(s.average)}</td>
            </tr>
          ))}
          <tr className="border-t border-zinc-500 font-semibold">
            <td className="py-1.5 pr-2">Total</td>
            <td />
            <td className="py-1.5 pr-2 text-right">{totalCoef}</td>
            <td className="py-1.5 pr-2 text-right">{formatAverage(totalPoints)}</td>
            <td colSpan={3} />
          </tr>
        </tbody>
      </table>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded border border-zinc-400 p-2 text-center">
          <p className="text-[11px] text-zinc-600">Moyenne générale</p>
          <p className="text-lg font-bold">{formatAverage(student.average)}</p>
        </div>
        <div className="rounded border border-zinc-400 p-2 text-center">
          <p className="text-[11px] text-zinc-600">Rang</p>
          <p className="text-lg font-bold">
            {student.rank ? `${student.rank}${student.rank === 1 ? "er" : "e"}` : "—"} / {studentCount}
          </p>
        </div>
        <div className="rounded border border-zinc-400 p-2 text-center">
          <p className="text-[11px] text-zinc-600">Classe : moy. / plus forte / plus faible</p>
          <p className="font-semibold">
            {formatAverage(classAverage)} / {formatAverage(best)} / {formatAverage(worst)}
          </p>
        </div>
        <div className="rounded border border-zinc-400 p-2 text-center">
          <p className="text-[11px] text-zinc-600">Absences / justifiées / retards</p>
          <p className="font-semibold">
            {attendance.absences} / {attendance.justified} / {attendance.retards}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="min-h-16 rounded border border-zinc-400 p-2">
          <p className="text-[11px] text-zinc-600">Appréciation générale</p>
          <p>{note?.appreciation || gradeAppreciation(student.average)}</p>
        </div>
        <div className="min-h-16 rounded border border-zinc-400 p-2">
          <p className="text-[11px] text-zinc-600">Décision du conseil</p>
          <p>{note?.decision ?? ""}</p>
        </div>
      </div>

      <div className="flex justify-between pt-8">
        <p className="border-t border-zinc-400 px-6 pt-1 text-zinc-600">Le professeur principal</p>
        <p className="border-t border-zinc-400 px-6 pt-1 text-zinc-600">Le parent</p>
        <p className="border-t border-zinc-400 px-6 pt-1 text-zinc-600">La direction</p>
      </div>
    </div>
  );
}
