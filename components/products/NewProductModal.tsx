"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { ProductForm } from "@/components/products/ProductForm";
import { createProductAction } from "@/lib/actions/products";
import type { CustomFieldDef } from "@/lib/activity-config";

type Option = { id: string; name: string };

/**
 * Formulaire "Nouveau produit" en popup au-dessus de la liste (au lieu
 * d'une page séparée /produits/nouveau) — le déclencheur est fourni par
 * l'appelant via `trigger` pour pouvoir réutiliser ce même popup à
 * plusieurs endroits de la page (bouton barre d'outils, état vide, FAB
 * mobile) avec des styles différents.
 */
export function NewProductModal({
  categories,
  brands,
  suppliers,
  locations,
  defaultLocationId,
  customFieldDefs,
  showTrackUnits,
  packagingEnabled,
  trigger,
}: {
  categories: Option[];
  brands: Option[];
  suppliers: Option[];
  locations: Option[];
  defaultLocationId?: string;
  customFieldDefs?: CustomFieldDef[];
  showTrackUnits?: boolean;
  packagingEnabled?: boolean;
  trigger: (open: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {trigger(() => setOpen(true))}
      <Modal open={open} onClose={() => setOpen(false)} title="Nouveau produit">
        <ProductForm
          action={createProductAction}
          categories={categories}
          brands={brands}
          suppliers={suppliers}
          locations={locations}
          defaultLocationId={defaultLocationId}
          customFieldDefs={customFieldDefs}
          showTrackUnits={showTrackUnits}
          packagingEnabled={packagingEnabled}
          submitLabel="Créer le produit"
        />
      </Modal>
    </>
  );
}
