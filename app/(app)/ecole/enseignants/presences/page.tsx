import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getTeacherRollCallAction, saveTeacherRollCallAction } from "@/lib/actions/school-attendance";
import { RollCallForm } from "@/components/school/RollCallForm";
import { EmptyState } from "@/components/ui/Empty";
import { FILTER_INPUT, FILTER_BUTTON } from "@/components/school/styles";

export default async function TeacherAttendancePage({ searchParams }: { searchParams: Promise<{ jour?: string }> }) {
  const { jour } = await searchParams;
  const day = jour && /^\d{4}-\d{2}-\d{2}$/.test(jour) ? jour : new Date().toISOString().slice(0, 10);
  const rows = await getTeacherRollCallAction(day);

  return (
    <div className="max-w-3xl space-y-6">
      <Link href="/ecole/enseignants" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800">
        <ArrowLeft className="h-4 w-4" /> Enseignants
      </Link>
      <h1 className="text-xl font-bold text-zinc-900">Présences des enseignants</h1>
      <form className="flex flex-wrap gap-2">
        <input type="date" name="jour" defaultValue={day} className={FILTER_INPUT} />
        <button type="submit" className={FILTER_BUTTON}>
          Afficher
        </button>
      </form>
      {rows.length === 0 ? (
        <EmptyState title="Aucun enseignant en poste" description="Ajoutez d'abord vos enseignants." />
      ) : (
        <RollCallForm
          key={day}
          rows={rows.map((r) => ({ id: r.teacherId, name: r.name, status: r.status, note: r.note }))}
          hidden={{ day }}
          action={saveTeacherRollCallAction}
        />
      )}
    </div>
  );
}
