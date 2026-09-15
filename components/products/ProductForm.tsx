"use client";

import { useActionState, useState } from "react";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { Button, ButtonLink } from "@/components/ui/Button";
import { BarcodeScannerButton } from "./BarcodeScannerButton";
import { ImageUploadField } from "@/components/ui/ImageUploadField";
import type { ActionState } from "@/lib/actions/products";
import type { CustomFieldDef } from "@/lib/activity-config";

type Option = { id: string; name: string };

export function ProductForm({
  action,
  categories,
  suppliers,
  locations,
  defaultLocationId,
  customFieldDefs,
  initial,
  submitLabel,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  categories: Option[];
  suppliers: Option[];
  locations: Option[];
  defaultLocationId?: string;
  customFieldDefs?: CustomFieldDef[];
  initial?: {
    name: string;
    reference: string;
    categoryId: string | null;
    brand: string | null;
    description: string | null;
    unit: string;
    purchasePrice: number;
    salePrice: number;
    minStock: number;
    shelfLocation: string | null;
    supplierId: string | null;
    barcode: string | null;
    photoUrl?: string | null;
    customFields?: Record<string, string>;
    trackUnits?: boolean;
  };
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [barcode, setBarcode] = useState(initial?.barcode ?? "");

  return (
    <form action={formAction} className="space-y-6">
      <ImageUploadField
        name="photo"
        removeFieldName="removePhoto"
        initialUrl={initial?.photoUrl}
        label="Photo du produit"
        hint="Prenez une photo ou choisissez-la dans la galerie (JPEG, PNG, WebP — 5 Mo max)."
        size={96}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Nom du produit" htmlFor="name">
          <Input id="name" name="name" defaultValue={initial?.name} required autoFocus />
        </Field>
        <Field
          label="Référence"
          htmlFor="reference"
          hint={initial ? undefined : "Laissez vide pour une génération automatique (ZND-000001)"}
        >
          <Input
            id="reference"
            name="reference"
            defaultValue={initial?.reference}
            disabled={!!initial}
            placeholder="Génération automatique"
          />
        </Field>
        <Field label="Catégorie" htmlFor="categoryId">
          <Select id="categoryId" name="categoryId" defaultValue={initial?.categoryId ?? ""}>
            <option value="">Aucune</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Marque (facultatif)" htmlFor="brand">
          <Input id="brand" name="brand" defaultValue={initial?.brand ?? ""} />
        </Field>
        <Field label="Prix d'achat" htmlFor="purchasePrice">
          <Input
            id="purchasePrice"
            name="purchasePrice"
            type="number"
            min={0}
            step="1"
            defaultValue={initial?.purchasePrice}
            required
          />
        </Field>
        <Field label="Prix de vente" htmlFor="salePrice">
          <Input
            id="salePrice"
            name="salePrice"
            type="number"
            min={0}
            step="1"
            defaultValue={initial?.salePrice}
            required
          />
        </Field>
        {!initial && (
          <>
            <Field label="Quantité initiale" htmlFor="quantity">
              <Input id="quantity" name="quantity" type="number" min={0} defaultValue={0} />
            </Field>
            <Field label="Boutique du stock initial" htmlFor="locationId">
              <Select id="locationId" name="locationId" defaultValue={defaultLocationId ?? ""}>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </Select>
            </Field>
          </>
        )}
        <Field label="Stock minimum (seuil d'alerte)" htmlFor="minStock">
          <Input
            id="minStock"
            name="minStock"
            type="number"
            min={0}
            defaultValue={initial?.minStock ?? 5}
          />
        </Field>
        <Field label="Unité" htmlFor="unit">
          <Input id="unit" name="unit" defaultValue={initial?.unit ?? "unité"} />
        </Field>
        <Field label="Emplacement en rayon (facultatif)" htmlFor="shelfLocation">
          <Input
            id="shelfLocation"
            name="shelfLocation"
            defaultValue={initial?.shelfLocation ?? ""}
            placeholder="Ex: Rayon 3"
          />
        </Field>
        <Field label="Fournisseur (facultatif)" htmlFor="supplierId">
          <Select id="supplierId" name="supplierId" defaultValue={initial?.supplierId ?? ""}>
            <option value="">Aucun</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Code-barres (facultatif)" htmlFor="barcode">
          <div className="flex gap-2">
            <Input
              id="barcode"
              name="barcode"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="Scanner ou saisir manuellement"
            />
            <BarcodeScannerButton onDetected={setBarcode} />
          </div>
        </Field>
      </div>
      <Field label="Description (facultatif)" htmlFor="description">
        <Textarea id="description" name="description" defaultValue={initial?.description ?? ""} rows={3} />
      </Field>

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-200 p-3.5">
        <input
          type="checkbox"
          name="trackUnits"
          defaultChecked={initial?.trackUnits ?? false}
          className="mt-0.5 h-4 w-4 shrink-0 rounded accent-zindo-green-500"
        />
        <span>
          <span className="block text-sm font-medium text-zinc-900">
            Suivre chaque exemplaire individuellement (moto, engin...)
          </span>
          <span className="block text-xs text-zinc-500">
            Au lieu d&apos;une simple quantité, chaque exemplaire aura sa propre fiche (numéro de châssis, numéro de
            moteur, couleur, disponibilité du CMC). Le stock affiché correspond au nombre d&apos;exemplaires
            enregistrés — gérable depuis la fiche du produit une fois créé.
          </span>
        </span>
      </label>

      {customFieldDefs && customFieldDefs.length > 0 && (
        <div className="grid grid-cols-1 gap-4 border-t border-zinc-100 pt-4 sm:grid-cols-2">
          {customFieldDefs.map((def) => (
            <Field key={def.key} label={def.label} htmlFor={`custom_${def.key}`}>
              <Input
                id={`custom_${def.key}`}
                name={`custom_${def.key}`}
                type={def.type === "number" ? "number" : def.type === "date" ? "date" : "text"}
                defaultValue={initial?.customFields?.[def.key] ?? ""}
              />
            </Field>
          ))}
        </div>
      )}

      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <div className="flex justify-end gap-2">
        <ButtonLink href="/produits" variant="outline">
          Annuler
        </ButtonLink>
        <Button type="submit" disabled={pending}>
          {pending ? "Enregistrement..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
