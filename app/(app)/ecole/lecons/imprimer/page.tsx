import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireSchoolAccess, getAccessibleClasses, getClassSubjects } from "@/lib/school-access";
import { getChaptersAction } from "@/lib/actions/school-teaching";
import { currentSchoolYear } from "@/lib/school-constants";
import { PrintDocumentButton } from "@/components/purchase-orders/PrintDocumentButton";

/** Programme d'une matière (chapitres et leçons), imprimable ou en PDF. */
export default async function PrintLessonsPage({ searchParams }: { searchParams: Promise<{ classe?: string; matiere?: string }> }) {
  const sp = await searchParams;
  const access = await requireSchoolAccess("teach");
  const classes = await getAccessibleClasses(access);
  const cls = classes.find((c) => c.id === sp.classe);
  const subject = cls ? (await getClassSubjects(access, cls.id)).find((s) => s.subjectId === sp.matiere) : undefined;
  const chapters = cls && subject ? await getChaptersAction(cls.id, subject.subjectId) : [];

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-center justify-between gap-3 print:hidden">
        <Link href={`/ecole/lecons?classe=${sp.classe ?? ""}&matiere=${sp.matiere ?? ""}`} className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800">
          <ArrowLeft className="h-4 w-4" /> Leçons
        </Link>
        <PrintDocumentButton />
      </div>
      <div className="space-y-5 rounded-xl border border-zinc-300 bg-white p-6 text-sm text-black print:border-0 print:p-0">
        <div className="border-b border-zinc-400 pb-3">
          <p className="text-base font-bold">{access.user.business.name}</p>
          <p className="text-lg font-bold">
            {subject?.name ?? "Matière"} — {cls?.name ?? "Classe"}
          </p>
          <p className="text-zinc-600">
            Année scolaire {currentSchoolYear()}
            {subject?.teacherName ? ` · ${subject.teacherName}` : ""}
          </p>
        </div>
        {chapters.length === 0 && <p>Aucune leçon.</p>}
        {chapters.map((c) => (
          <div key={c.id} className="space-y-3">
            <h2 className="text-base font-bold">
              Chapitre {c.position} — {c.title}
            </h2>
            {c.lessons.map((l) => (
              <div key={l.id} className="space-y-1 pl-3 print:break-inside-avoid">
                <h3 className="font-semibold">
                  Leçon {l.position} : {l.title}
                </h3>
                {l.content && <p className="whitespace-pre-wrap leading-relaxed">{l.content}</p>}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
