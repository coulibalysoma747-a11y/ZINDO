"use client";

import { useActionState, useRef, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { Button, ButtonLink } from "@/components/ui/Button";
import { BarcodeScannerButton } from "./BarcodeScannerButton";
import { ImageUploadField } from "@/components/ui/ImageUploadField";
import { PackagingTypePicker } from "@/components/products/PackagingTypePicker";
import { EntityQuickSelect } from "@/components/products/EntityQuickSelect";
import { getOrCreateCategoryByNameAction } from "@/lib/actions/categories";
import { getOrCreateBrandByNameAction } from "@/lib/actions/brands";
import type { ActionState } from "@/lib/actions/products";
import type { CustomFieldDef } from "@/lib/activity-config";
import { formatMoney } from "@/lib/format";

type Option = { id: string; name: string };

export function ProductForm({
  action,
  categories,
  brands,
  suppliers,
  locations,
  defaultLocationId,
  customFieldDefs,
  showTrackUnits = false,
  packagingEnabled = false,
  showUnitsPerCarton = false,
  initial,
  submitLabel,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  categories: Option[];
  brands: Option[];
  suppliers: Option[];
  locations: Option[];
  defaultLocationId?: string;
  customFieldDefs?: CustomFieldDef[];
  /** N'affiche la case "suivi individuel" que pour l'activité "Boutique de motos" — voir lib/activities.ts. */
  showTrackUnits?: boolean;
  /** Fonctionnalité "Conditionnements" activée pour ce commerce (voir lib/actions/packaging-units.ts). */
  packagingEnabled?: boolean;
  /** Réassort intelligent activé (module "bons-de-commande") : affiche le champ "Nombre par carton". */
  showUnitsPerCarton?: boolean;
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
    aliases?: string[];
    unitsPerCarton?: number | null;
  };
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [barcode, setBarcode] = useState(initial?.barcode ?? "");
  const [trackUnits, setTrackUnits] = useState(initial?.trackUnits ?? false);
  const [purchasePrice, setPurchasePrice] = useState(String(initial?.purchasePrice ?? ""));
  const [salePrice, setSalePrice] = useState(String(initial?.salePrice ?? ""));
  const [packagingRows, setPackagingRows] = useState<number[]>([]);
  const nextPackagingRowId = useRef(0);
  const [aliases, setAliases] = useState<string[]>(initial?.aliases ?? []);
  const MAX_ALIASES = 20;

  function addPackagingRow() {
    setPackagingRows((rows) => [...rows, nextPackagingRowId.current++]);
  }
  function removePackagingRow(rowId: number) {
    setPackagingRows((rows) => rows.filter((id) => id !== rowId));
  }

  function addAlias() {
    if (aliases.length >= MAX_ALIASES) return;
    setAliases((cur) => [...cur, ""]);
  }
  function updateAlias(index: number, value: string) {
    setAliases((cur) => cur.map((a, i) => (i === index ? value : a)));
  }
  function removeAlias(index: number) {
    setAliases((cur) => cur.filter((_, i) => i !== index));
  }

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
          <EntityQuickSelect
            id="categoryId"
            name="categoryId"
            options={categories}
            defaultValue={initial?.categoryId ?? ""}
            onCreate={getOrCreateCategoryByNameAction}
            submitValue="id"
            emptyLabel="Aucune"
            newPlaceholder="Nouvelle catégorie..."
          />
        </Field>
        <Field label="Marque (facultatif)" htmlFor="brand">
          <EntityQuickSelect
            id="brand"
            name="brand"
            options={brands}
            defaultValue={initial?.brand ?? ""}
            onCreate={getOrCreateBrandByNameAction}
            submitValue="name"
            emptyLabel="Aucune"
            newPlaceholder="Nouvelle marque..."
          />
        </Field>
        <Field label="Prix d'achat" htmlFor="purchasePrice">
          <Input
            id="purchasePrice"
            name="purchasePrice"
            type="number"
            min={0}
            step="1"
            defaultValue={initial?.purchasePrice}
            onChange={(e) => setPurchasePrice(e.target.value)}
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
            onChange={(e) => setSalePrice(e.target.value)}
            required
          />
        </Field>
        <MarginPreview purchasePrice={purchasePrice} salePrice={salePrice} />
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
        {showUnitsPerCarton && (
          <Field
            label="Nombre par carton (facultatif)"
            htmlFor="unitsPerCarton"
            hint="Ex. 12 : le réassort proposera toujours des cartons complets."
          >
            <Input
              id="unitsPerCarton"
              name="unitsPerCarton"
              type="number"
              min={0}
              defaultValue={initial?.unitsPerCarton ?? ""}
              placeholder="Laisser vide si pas de carton"
            />
          </Field>
        )}
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

      <div className="rounded-xl border border-zinc-200 p-3.5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-zinc-900">Autres noms (recherche)</p>
          <span className="text-xs text-zinc-400">
            {aliases.length}/{MAX_ALIASES}
          </span>
        </div>
        <p className="mt-1 text-xs text-zinc-500">
          Les autres appellations du produit ({MAX_ALIASES} au maximum) : « Omo » pour « savon en poudre », « cube »
          pour « Maggi »... On retrouvera l&apos;article en cherchant l&apos;un de ces noms. Le nom affiché sur les
          tickets et les factures reste le nom ci-dessus.
        </p>
        <div className="mt-3 space-y-2">
          {aliases.map((alias, i) => (
            <div key={i} className="flex gap-2">
              <Input name="aliases" value={alias} onChange={(e) => updateAlias(i, e.target.value)} />
              <button
                type="button"
                onClick={() => removeAlias(i)}
                className="rounded-lg border border-zinc-200 px-2.5 text-red-500 hover:bg-red-50"
                aria-label="Retirer ce nom"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        {aliases.length < MAX_ALIASES && (
          <Button type="button" variant="outline" size="sm" className="mt-3" onClick={addAlias}>
            <Plus className="h-3.5 w-3.5" /> Ajouter un autre nom
          </Button>
        )}
      </div>

      <Field label="Description (facultatif)" htmlFor="description">
        <Textarea id="description" name="description" defaultValue={initial?.description ?? ""} rows={3} />
      </Field>

      {showTrackUnits && (
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-200 p-3.5">
          <input
            type="checkbox"
            name="trackUnits"
            checked={trackUnits}
            onChange={(e) => setTrackUnits(e.target.checked)}
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
      )}

      {!initial && packagingEnabled && !trackUnits && (
        <div className="space-y-3 border-t border-zinc-100 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-zinc-900">Conditionnements (facultatif)</p>
              <p className="text-xs text-zinc-500">
                Ex : &quot;Carton de 12&quot; — vendable en plus de l&apos;unité de base, avec son propre prix.
              </p>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={addPackagingRow}>
              <Plus className="h-3.5 w-3.5" /> Ajouter un conditionnement
            </Button>
          </div>
          {packagingRows.map((rowId) => (
            <div
              key={rowId}
              className="grid grid-cols-1 gap-3 rounded-xl border border-zinc-200 p-3 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end"
            >
              <Field label="Type de conditionnement" htmlFor={`packagingName-${rowId}`}>
                <PackagingTypePicker id={`packagingName-${rowId}`} name="packagingName" />
              </Field>
              <Field label="Unités de base par colis" htmlFor={`packagingMultiplier-${rowId}`}>
                <Input id={`packagingMultiplier-${rowId}`} name="packagingMultiplier" type="number" min={1} step="any" />
              </Field>
              <Field label="Prix de vente du colis" htmlFor={`packagingSalePrice-${rowId}`}>
                <Input id={`packagingSalePrice-${rowId}`} name="packagingSalePrice" type="number" min={0} />
              </Field>
              <button
                type="button"
                onClick={() => removePackagingRow(rowId)}
                className="rounded-lg p-2 text-red-400 hover:bg-red-50 hover:text-red-600"
                aria-label="Supprimer ce conditionnement"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

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

/** Marge par unité, recalculée à chaque frappe dans les champs de prix. */
function MarginPreview({ purchasePrice, salePrice }: { purchasePrice: string; salePrice: string }) {
  if (purchasePrice === "" || salePrice === "") return null;
  const buy = Number(purchasePrice);
  const sell = Number(salePrice);
  if (!Number.isFinite(buy) || !Number.isFinite(sell)) return null;
  const margin = sell - buy;
  const rate = sell > 0 ? Math.round((margin / sell) * 1000) / 10 : 0;
  const invalid = margin < 0;
  return (
    <div
      className={`rounded-xl border p-3 text-sm sm:col-span-2 ${
        invalid ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-800"
      }`}
    >
      {invalid ? (
        "Le prix d'achat ne peut pas dépasser le prix de vente"
      ) : (
        <>
          Marge par unité : <strong>{formatMoney(margin)}</strong> ({rate} % du prix de vente)
        </>
      )}
    </div>
  );
}
