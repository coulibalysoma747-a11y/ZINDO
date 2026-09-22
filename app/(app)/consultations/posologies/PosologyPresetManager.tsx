"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Empty";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { PosologyPresetFormModal } from "./PosologyPresetFormModal";
import { deletePosologyPresetAction } from "@/lib/actions/posology-presets";

type PosologyPreset = { id: string; label: string };

export function PosologyPresetManager({ presets }: { presets: PosologyPreset[] }) {
  const [editing, setEditing] = useState<PosologyPreset | null | undefined>(undefined);
  const router = useRouter();

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={() => setEditing(null)}>
          <Plus className="h-4 w-4" /> Nouvelle posologie
        </Button>
      </div>

      {presets.length === 0 ? (
        <EmptyState
          title="Aucune posologie"
          description="Créez vos consignes de prise les plus courantes pour accélérer la saisie de l'ordonnance."
          action={
            <Button onClick={() => setEditing(null)}>
              <Plus className="h-4 w-4" /> Créer une posologie
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {presets.map((p) => (
            <Card key={p.id}>
              <CardBody className="flex items-center justify-between gap-2">
                <p className="truncate font-medium text-zinc-900">{p.label}</p>
                <div className="flex shrink-0 gap-1">
                  <button onClick={() => setEditing(p)} className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <ConfirmButton
                    label={<Trash2 className="h-4 w-4" />}
                    className="rounded-lg p-1.5 text-red-500 hover:bg-red-50"
                    confirmTitle="Supprimer la posologie"
                    confirmMessage={`Voulez-vous vraiment supprimer "${p.label}" de la liste ? Les ordonnances déjà enregistrées ne sont pas modifiées.`}
                    action={() => deletePosologyPresetAction(p.id)}
                    onDone={() => router.refresh()}
                  />
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <PosologyPresetFormModal open={editing !== undefined} preset={editing ?? null} onClose={() => setEditing(undefined)} />
    </>
  );
}
