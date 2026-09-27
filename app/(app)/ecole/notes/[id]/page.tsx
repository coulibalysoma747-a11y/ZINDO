import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getEvaluationSheetAction } from "@/lib/actions/school-grades";
import { EVALUATION_KINDS, termLabel } from "@/lib/school-constants";
import { formatDate } from "@/lib/format";
import { GradeSheet } from "./GradeSheet";

export default async function EvaluationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sheet = await getEvaluationSheetAction(id);
  if (!sheet) notFound();
  const e = sheet.evaluation;

  return (
    <div className="max-w-3xl space-y-6">
      <Link href={`/ecole/notes?classe=${e.classId}&trimestre=${e.term}`} className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800">
        <ArrowLeft className="h-4 w-4" /> Notes
      </Link>
      <div>
        <h1 className="text-xl font-bold text-zinc-900">{e.title}</h1>
        <p className="text-sm text-zinc-500">
          {e.className} · {e.subjectName} · {EVALUATION_KINDS[e.kind]} · {termLabel(e.term)} · {formatDate(e.day)} · noté sur {e.maxScore}
        </p>
      </div>
      <GradeSheet evaluation={e} rows={sheet.rows} isManager={sheet.isManager} />
    </div>
  );
}
