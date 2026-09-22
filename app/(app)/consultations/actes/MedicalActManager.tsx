"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Empty";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { MedicalActFormModal } from "./MedicalActFormModal";
import { deleteMedicalActAction } from "@/lib/actions/medical-acts";
import { formatMoney } from "@/lib/format";

type MedicalAct = { id: string; name: string; defaultFee: number };

export function MedicalActManager({ acts, currency }: { acts: MedicalAct[]; currency: string }) {
  const [editing, setEditing] = useState<MedicalAct | null | undefined>(undefined);
  const router = useRouter();

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={() => setEditing(null)}>
          <Plus className="h-4 w-4" /> Nouvel acte
        </Button>
      </div>

      {acts.length === 0 ? (
        <EmptyState
          title="Aucun acte médical"
          description="Créez vos actes (consultation générale, pansement, injection...) pour accélérer la saisie."
          action={
            <Button onClick={() => setEditing(null)}>
              <Plus className="h-4 w-4" /> Créer un acte
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {acts.map((a) => (
            <Card key={a.id}>
              <CardBody className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium text-zinc-900">{a.name}</p>
                  <p className="mt-1 text-sm font-semibold text-zindo-green-600">{formatMoney(a.defaultFee, currency)}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button onClick={() => setEditing(a)} className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <ConfirmButton
                    label={<Trash2 className="h-4 w-4" />}
                    className="rounded-lg p-1.5 text-red-500 hover:bg-red-50"
                    confirmTitle="Supprimer l'acte"
                    confirmMessage={`Voulez-vous vraiment supprimer "${a.name}" ?`}
                    action={() => deleteMedicalActAction(a.id)}
                    onDone={() => router.refresh()}
                  />
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <MedicalActFormModal open={editing !== undefined} act={editing ?? null} onClose={() => setEditing(undefined)} />
    </>
  );
}
