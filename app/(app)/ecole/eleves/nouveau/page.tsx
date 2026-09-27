import { getSchoolClassesAction, getSchoolContextAction } from "@/lib/actions/school";
import { StudentForm } from "../StudentForm";

export default async function NewStudentPage({ searchParams }: { searchParams: Promise<{ classe?: string }> }) {
  const { classe } = await searchParams;
  const [{ currency }, classes] = await Promise.all([getSchoolContextAction(), getSchoolClassesAction()]);
  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-xl font-bold text-zinc-900">Nouvel élève</h1>
      <StudentForm classes={classes} currency={currency} defaultClassId={classe} />
    </div>
  );
}
