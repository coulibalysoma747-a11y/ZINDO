import { notFound } from "next/navigation";
import { getSchoolClassesAction, getSchoolContextAction, getStudentAction } from "@/lib/actions/school";
import { StudentForm } from "../../StudentForm";

export default async function EditStudentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [{ currency }, classes, data] = await Promise.all([getSchoolContextAction(), getSchoolClassesAction(), getStudentAction(id)]);
  if (!data) notFound();
  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-xl font-bold text-zinc-900">
        Modifier {data.student.lastName} {data.student.firstName}
      </h1>
      <StudentForm classes={classes} currency={currency} student={data.student} />
    </div>
  );
}
