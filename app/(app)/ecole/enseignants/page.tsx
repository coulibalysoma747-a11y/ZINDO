import { Presentation, ClipboardCheck } from "lucide-react";
import { getTeachersAction, getSchoolUsersAction } from "@/lib/actions/school-staff";
import { getTeacherAttendanceMonthAction } from "@/lib/actions/school-attendance";
import { ButtonLink } from "@/components/ui/Button";
import { TeachersManager } from "./TeachersManager";

export default async function TeachersPage() {
  const [teachers, users, month] = await Promise.all([getTeachersAction(), getSchoolUsersAction(), getTeacherAttendanceMonthAction()]);
  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Presentation className="h-5 w-5 text-zinc-500" />
          <div>
            <h1 className="text-xl font-bold text-zinc-900">Enseignants</h1>
            <p className="text-sm text-zinc-500">
              Reliez chaque enseignant à son compte ZINDO (Utilisateurs) pour qu&apos;il voie ses classes, ses cours et ses leçons.
            </p>
          </div>
        </div>
        <ButtonLink href="/ecole/enseignants/presences" variant="secondary">
          <ClipboardCheck className="h-4 w-4" /> Présences des enseignants
        </ButtonLink>
      </div>
      <TeachersManager teachers={teachers} users={users} month={month} />
    </div>
  );
}
