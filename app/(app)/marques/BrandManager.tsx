"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Empty";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { BrandFormModal } from "./BrandFormModal";
import { deleteBrandAction } from "@/lib/actions/brands";

type Brand = { id: string; name: string; productCount: number };

export function BrandManager({ brands }: { brands: Brand[] }) {
  const [editing, setEditing] = useState<Brand | null | undefined>(undefined);
  const router = useRouter();

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={() => setEditing(null)}>
          <Plus className="h-4 w-4" /> Nouvelle marque
        </Button>
      </div>

      {brands.length === 0 ? (
        <EmptyState
          title="Aucune marque"
          description="Créez votre première marque pour la retrouver dans le formulaire produit."
          action={
            <Button onClick={() => setEditing(null)}>
              <Plus className="h-4 w-4" /> Créer une marque
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {brands.map((b) => (
            <Card key={b.id}>
              <CardBody className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium text-zinc-900">{b.name}</p>
                  <p className="mt-1 text-xs text-zinc-400">{b.productCount} produit(s)</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button onClick={() => setEditing(b)} className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <ConfirmButton
                    label={<Trash2 className="h-4 w-4" />}
                    className="rounded-lg p-1.5 text-red-500 hover:bg-red-50"
                    confirmTitle="Supprimer la marque"
                    confirmMessage={`Voulez-vous vraiment supprimer "${b.name}" ?`}
                    action={() => deleteBrandAction(b.id)}
                    onDone={() => router.refresh()}
                  />
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <BrandFormModal open={editing !== undefined} brand={editing ?? null} onClose={() => setEditing(undefined)} />
    </>
  );
}
