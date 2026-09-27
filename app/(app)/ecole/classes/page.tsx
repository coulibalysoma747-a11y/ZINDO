import { School } from "lucide-react";
import { getSchoolClassesAction, getSchoolContextAction } from "@/lib/actions/school";
import { ClassesManager } from "./ClassesManager";

export default async function SchoolClassesPage() {
  const [{ currency }, classes] = await Promise.all([getSchoolContextAction(), getSchoolClassesAction()]);

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-2">
        <School className="h-5 w-5 text-zinc-500" />
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Classes</h1>
          <p className="text-sm text-zinc-500">Vos classes et le montant annuel de la scolarité de chacune.</p>
        </div>
      </div>
      <ClassesManager classes={classes} currency={currency} />
    </div>
  );
}
