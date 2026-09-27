import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getReportCardsAction } from "@/lib/actions/school-grades";
import { TERMS, termLabel } from "@/lib/school-constants";
import { ReportCard } from "@/components/school/ReportCard";
import { PrintDocumentButton } from "@/components/purchase-orders/PrintDocumentButton";
import { ReportNoteForm } from "./ReportNoteForm";

export default async function StudentReportCardPage({ params, searchParams }: { params: Promise<{ studentId: string }>; searchParams: Promise<{ trimestre?: string }> }) {
  const { studentId } = await params;
  const sp = await searchParams;
  const term = [1, 2, 3].includes(Number(sp.trimestre)) ? Number(sp.trimestre) : 1;
  const data = await getReportCardsAction({ studentId, term });
  const student = data?.report.students[0];
  if (!data || !student) notFound();
  const note = data.notes[studentId];

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/ecole/bulletins?classe=${data.classId}&trimestre=${term}`} className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800">
          <ArrowLeft className="h-4 w-4" /> Bulletins de la classe
        </Link>
        <div className="flex items-center gap-2">
          {TERMS.map((t) => (
            <Link
              key={t}
              href={`/ecole/bulletins/${studentId}?trimestre=${t}`}
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm ${t === term ? "bg-zinc-900 text-white dark:bg-slate-100 dark:text-slate-900" : "text-zinc-600 hover:bg-zinc-100"}`}
            >
              {termLabel(t)}
            </Link>
          ))}
          <PrintDocumentButton />
        </div>
      </div>

      <div className="print:hidden">
        <ReportNoteForm key={`${studentId}-${term}`} studentId={studentId} term={term} appreciation={note?.appreciation ?? ""} decision={note?.decision ?? ""} />
      </div>

      <ReportCard
        school={data.school}
        className={data.report.className}
        mainTeacher={data.report.mainTeacher}
        studentCount={data.report.studentCount}
        classAverage={data.report.classAverage}
        best={data.report.best}
        worst={data.report.worst}
        student={student}
        term={term}
        attendance={data.attendance[studentId]}
        note={note}
      />
    </div>
  );
}
