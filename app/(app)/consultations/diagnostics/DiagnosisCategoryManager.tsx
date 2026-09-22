"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Empty";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { DiagnosisCategoryFormModal } from "./DiagnosisCategoryFormModal";
import { deleteDiagnosisCategoryAction } from "@/lib/actions/diagnosis-categories";

type DiagnosisCategory = { id: string; name: string };

export function DiagnosisCategoryManager({ categories }: { categories: DiagnosisCategory[] }) {
  const [editing, setEditing] = useState<DiagnosisCategory | null | undefined>(undefined);
  const router = useRouter();

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={() => setEditing(null)}>
          <Plus className="h-4 w-4" /> Nouveau diagnostic
        </Button>
      </div>

      {categories.length === 0 ? (
        <EmptyState
          title="Aucun diagnostic"
          description="Créez vos diagnostics/pathologies les plus courants pour accélérer la saisie."
          action={
            <Button onClick={() => setEditing(null)}>
              <Plus className="h-4 w-4" /> Créer un diagnostic
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <Card key={c.id}>
              <CardBody className="flex items-center justify-between gap-2">
                <p className="truncate font-medium text-zinc-900">{c.name}</p>
                <div className="flex shrink-0 gap-1">
                  <button onClick={() => setEditing(c)} className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <ConfirmButton
                    label={<Trash2 className="h-4 w-4" />}
                    className="rounded-lg p-1.5 text-red-500 hover:bg-red-50"
                    confirmTitle="Supprimer le diagnostic"
                    confirmMessage={`Voulez-vous vraiment supprimer "${c.name}" de la liste ? Les consultations déjà enregistrées ne sont pas modifiées.`}
                    action={() => deleteDiagnosisCategoryAction(c.id)}
                    onDone={() => router.refresh()}
                  />
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <DiagnosisCategoryFormModal open={editing !== undefined} category={editing ?? null} onClose={() => setEditing(undefined)} />
    </>
  );
}
