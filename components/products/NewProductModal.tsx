"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { ProductForm } from "@/components/products/ProductForm";
import { createProductAction } from "@/lib/actions/products";
import type { CustomFieldDef } from "@/lib/activity-config";

type Option = { id: string; name: string };

/**
 * Formulaire "Nouveau produit" en popup au-dessus de la liste (au lieu
 * d'une page séparée /produits/nouveau). Le déclencheur est fourni par
 * l'appelant via `children` (pas une prop fonction : un composant serveur
 * ne peut pas passer de fonction à un composant client, seulement du JSX)
 * pour pouvoir réutiliser ce même popup à plusieurs endroits de la page
 * (bouton barre d'outils, état vide, FAB mobile) avec des styles différents.
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
  children,
}: {
  categories: Option[];
  brands: Option[];
  suppliers: Option[];
  locations: Option[];
  defaultLocationId?: string;
  customFieldDefs?: CustomFieldDef[];
  showTrackUnits?: boolean;
  packagingEnabled?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {/* display:contents — n'affecte pas la mise en page (le bouton flottant
          garde son positionnement fixed), ne fait que capter le clic. */}
      <span className="contents" onClick={() => setOpen(true)}>
        {children}
      </span>
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
