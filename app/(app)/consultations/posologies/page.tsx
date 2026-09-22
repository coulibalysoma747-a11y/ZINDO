import { getPosologyPresetsAction } from "@/lib/actions/posology-presets";
import { PosologyPresetManager } from "./PosologyPresetManager";

export default async function PosologyPresetsPage() {
  const presets = await getPosologyPresetsAction();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Posologies</h1>
        <p className="text-sm text-zinc-500">
          Vos consignes de prise courantes (ex. « 1 fois par jour », « 1 le matin et 1 le soir »), proposées dans
          l&apos;ordonnance de l&apos;écran Nouvelle consultation. Vous pouvez toujours en saisir une nouvelle à la
          volée depuis l&apos;ordonnance.
        </p>
      </div>
      <PosologyPresetManager presets={presets} />
    </div>
  );
}
