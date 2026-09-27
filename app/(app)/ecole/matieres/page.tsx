import { BookOpen } from "lucide-react";
import { getSubjectsAction } from "@/lib/actions/school-staff";
import { SubjectsManager } from "./SubjectsManager";

export default async function SubjectsPage() {
  const subjects = await getSubjectsAction();
  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-2">
        <BookOpen className="h-5 w-5 text-zinc-500" />
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Matières</h1>
          <p className="text-sm text-zinc-500">
            La liste des matières de l&apos;établissement. Le coefficient et l&apos;enseignant se choisissent ensuite dans chaque classe.
          </p>
        </div>
      </div>
      <SubjectsManager subjects={subjects} />
    </div>
  );
}
