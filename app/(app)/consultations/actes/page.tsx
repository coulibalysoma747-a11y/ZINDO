import { requireUser } from "@/lib/auth";
import { getMedicalActsAction } from "@/lib/actions/medical-acts";
import { MedicalActManager } from "./MedicalActManager";

export default async function MedicalActsPage() {
  const [user, acts] = await Promise.all([requireUser(), getMedicalActsAction()]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Actes médicaux</h1>
        <p className="text-sm text-zinc-500">
          Définissez vos actes et leur tarif par défaut pour accélérer la saisie des consultations.
        </p>
      </div>
      <MedicalActManager
        acts={acts.map((a) => ({ id: a.id, name: a.name, defaultFee: a.defaultFee }))}
        currency={user.business.currency}
      />
    </div>
  );
}
