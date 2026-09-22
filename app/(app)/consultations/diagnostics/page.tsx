import { getDiagnosisCategoriesAction } from "@/lib/actions/diagnosis-categories";
import { DiagnosisCategoryManager } from "./DiagnosisCategoryManager";

export default async function DiagnosisCategoriesPage() {
  const categories = await getDiagnosisCategoriesAction();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Diagnostics</h1>
        <p className="text-sm text-zinc-500">
          Votre liste de diagnostics/pathologies courantes, proposée dans le sélecteur de l&apos;écran Nouvelle
          consultation. Vous pouvez toujours en saisir un nouveau à la volée depuis ce sélecteur.
        </p>
      </div>
      <DiagnosisCategoryManager categories={categories} />
    </div>
  );
}
