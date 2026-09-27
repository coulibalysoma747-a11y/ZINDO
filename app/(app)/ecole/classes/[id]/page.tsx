import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Users, CalendarDays, ScrollText } from "lucide-react";
import { requireSchoolAccess, getClassSubjects } from "@/lib/school-access";
import { getSchoolClassesAction, getSchoolContextAction } from "@/lib/actions/school";
import { getSubjectsAction, getTeachersAction } from "@/lib/actions/school-staff";
import { formatMoney } from "@/lib/format";
import { Card, CardBody } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import { ClassSubjectsManager } from "./ClassSubjectsManager";

export default async function ClassDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await requireSchoolAccess("manage");
  const [{ currency }, classes, subjects, teachers, classSubjects] = await Promise.all([
    getSchoolContextAction(),
    getSchoolClassesAction(),
    getSubjectsAction(),
    getTeachersAction(),
    getClassSubjects(access, id),
  ]);
  const cls = classes.find((c) => c.id === id);
  if (!cls) notFound();
  const activeTeachers = teachers.filter((t) => t.active).map((t) => ({ id: t.id, name: `${t.lastName} ${t.firstName}` }));
  const totalCoef = classSubjects.reduce((s, c) => s + c.coefficient, 0);

  return (
    <div className="max-w-3xl space-y-6">
      <Link href="/ecole/classes" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800">
        <ArrowLeft className="h-4 w-4" /> Classes
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">{cls.name}</h1>
          <p className="text-sm text-zinc-500">
            {cls.level ? `${cls.level} · ` : ""}
            {cls.studentCount} élève{cls.studentCount > 1 ? "s" : ""} · Scolarité {formatMoney(cls.annualFee, currency)} / an
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href={`/ecole/eleves?classe=${id}`} variant="secondary">
            <Users className="h-4 w-4" /> Élèves
          </ButtonLink>
          <ButtonLink href={`/ecole/emploi-du-temps?classe=${id}`} variant="secondary">
            <CalendarDays className="h-4 w-4" /> Emploi du temps
          </ButtonLink>
          <ButtonLink href={`/ecole/bulletins?classe=${id}`} variant="secondary">
            <ScrollText className="h-4 w-4" /> Résultats
          </ButtonLink>
        </div>
      </div>

      <Card>
        <CardBody>
          <ClassSubjectsManager
            classId={id}
            mainTeacherId={cls.mainTeacherId}
            classSubjects={classSubjects}
            subjects={subjects.map((s) => ({ id: s.id, name: s.name }))}
            teachers={activeTeachers}
          />
          {classSubjects.length > 0 && <p className="mt-3 text-xs text-zinc-500">Total des coefficients : {totalCoef}</p>}
        </CardBody>
      </Card>
    </div>
  );
}
