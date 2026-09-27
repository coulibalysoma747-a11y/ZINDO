import { Coins } from "lucide-react";
import { getSchoolFeesAction, getSchoolClassesAction, getSchoolContextAction } from "@/lib/actions/school";
import { FeesManager } from "./FeesManager";

export default async function SchoolFeesPage() {
  const [{ currency }, fees, classes] = await Promise.all([getSchoolContextAction(), getSchoolFeesAction(), getSchoolClassesAction()]);
  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-2">
        <Coins className="h-5 w-5 text-zinc-500" />
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Frais scolaires</h1>
          <p className="text-sm text-zinc-500">
            Inscription, cantine, transport, uniforme… en plus de la scolarité, qui se règle dans Classes.
          </p>
        </div>
      </div>
      <FeesManager fees={fees} classes={classes.map((c) => ({ id: c.id, name: c.name }))} currency={currency} />
    </div>
  );
}
