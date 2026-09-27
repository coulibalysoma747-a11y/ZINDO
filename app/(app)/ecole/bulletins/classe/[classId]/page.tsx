import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getReportCardsAction } from "@/lib/actions/school-grades";
import { termLabel } from "@/lib/school-constants";
import { ReportCard } from "@/components/school/ReportCard";
import { PrintDocumentButton } from "@/components/purchase-orders/PrintDocumentButton";

/** Tous les bulletins d'une classe, un par page à l'impression. */
export default async function ClassReportCardsPage({ params, searchParams }: { params: Promise<{ classId: string }>; searchParams: Promise<{ trimestre?: string }> }) {
  const { classId } = await params;
  const sp = await searchParams;
  const term = [1, 2, 3].includes(Number(sp.trimestre)) ? Number(sp.trimestre) : 1;
  const data = await getReportCardsAction({ classId, term });
  if (!data) notFound();

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/ecole/bulletins?classe=${classId}&trimestre=${term}`} className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800">
          <ArrowLeft className="h-4 w-4" /> Bulletins
        </Link>
        <p className="text-sm text-zinc-500">
          {data.report.className} · {termLabel(term)} · {data.report.students.length} bulletins
        </p>
        <PrintDocumentButton />
      </div>
      {data.report.students.map((s) => (
        <ReportCard
          key={s.studentId}
          school={data.school}
          className={data.report.className}
          mainTeacher={data.report.mainTeacher}
          studentCount={data.report.studentCount}
          classAverage={data.report.classAverage}
          best={data.report.best}
          worst={data.report.worst}
          student={s}
          term={term}
          attendance={data.attendance[s.studentId]}
          note={data.notes[s.studentId]}
        />
      ))}
    </div>
  );
}
