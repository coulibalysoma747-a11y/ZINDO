"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Empty";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { CategoryFormModal } from "./CategoryFormModal";
import { deleteCategoryAction } from "@/lib/actions/categories";

type Category = {
  id: string;
  name: string;
  description: string | null;
  productCount: number;
};

export function CategoryManager({ categories }: { categories: Category[] }) {
  const [editing, setEditing] = useState<Category | null | undefined>(undefined);
  const router = useRouter();

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={() => setEditing(null)}>
          <Plus className="h-4 w-4" /> Nouvelle catégorie
        </Button>
      </div>

      {categories.length === 0 ? (
        <EmptyState
          title="Aucune catégorie"
          description="Créez votre première catégorie pour organiser vos produits."
          action={
            <Button onClick={() => setEditing(null)}>
              <Plus className="h-4 w-4" /> Créer une catégorie
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <Card key={c.id}>
              <CardBody className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium text-zinc-900">{c.name}</p>
                  {c.description && (
                    <p className="truncate text-sm text-zinc-500">{c.description}</p>
                  )}
                  <p className="mt-1 text-xs text-zinc-400">{c.productCount} produit(s)</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={() => setEditing(c)}
                    className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <ConfirmButton
                    label={<Trash2 className="h-4 w-4" />}
                    className="rounded-lg p-1.5 text-red-500 hover:bg-red-50"
                    confirmTitle="Supprimer la catégorie"
                    confirmMessage={`Voulez-vous vraiment supprimer "${c.name}" ?`}
                    action={() => deleteCategoryAction(c.id)}
                    onDone={() => router.refresh()}
                  />
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <CategoryFormModal
        open={editing !== undefined}
        category={editing ?? null}
        onClose={() => setEditing(undefined)}
      />
    </>
  );
}
