"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, Pencil, Check, X, QrCode } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { formatMoney } from "@/lib/format";
import { PackagingTypePicker } from "@/components/products/PackagingTypePicker";
import {
  addPackagingUnitAction,
  updatePackagingUnitAction,
  deletePackagingUnitAction,
  type PackagingUnit,
} from "@/lib/actions/packaging-units";

/**
 * Conditionnements de vente d'un produit (ex. "Carton de 12") : chacun a son
 * propre prix et peut avoir son propre code-barres/QR scannable à la caisse,
 * en plus de l'unité de base déjà gérée sur la fiche produit — voir
 * lib/actions/packaging-units.ts.
 */
export function PackagingUnitsPanel({
  productId,
  units,
  currency,
  baseUnit,
  basePrice,
}: {
  productId: string;
  units: PackagingUnit[];
  currency: string;
  baseUnit: string;
  basePrice: number;
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [multiplier, setMultiplier] = useState("");

  const suggestedPrice = Number(multiplier) > 0 ? Math.round(Number(multiplier) * basePrice) : null;

  function handleAdd(formData: FormData) {
    if (!formData.get("salePrice") && suggestedPrice != null) {
      formData.set("salePrice", String(suggestedPrice));
    }
    setError(null);
    startTransition(async () => {
      const result = await addPackagingUnitAction(productId, formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      setFormOpen(false);
      setMultiplier("");
    });
  }

  function handleUpdate(unitId: string, formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await updatePackagingUnitAction(unitId, formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      setEditingId(null);
    });
  }

  function handleDelete(unitId: string) {
    if (!confirm("Supprimer ce conditionnement ?")) return;
    setError(null);
    startTransition(async () => {
      const result = await deletePackagingUnitAction(unitId);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">
          Unité de base : <span className="font-medium text-zinc-700">{baseUnit}</span> — ajoutez des conditionnements
          vendables (carton, pack...) avec leur propre prix.
        </p>
        <Button size="sm" variant="outline" onClick={() => setFormOpen((v) => !v)}>
          {formOpen ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          {formOpen ? "Annuler" : "Ajouter"}
        </Button>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {formOpen && (
        <form action={handleAdd} className="space-y-3 rounded-xl border border-zinc-200 p-3">
          <Field label="Type de conditionnement" htmlFor="name">
            <PackagingTypePicker id="name" name="name" />
          </Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label={`Nombre de pièces (${baseUnit}) par colis`} htmlFor="multiplier">
              <Input
                id="multiplier"
                name="multiplier"
                type="number"
                min={1}
                step="any"
                required
                value={multiplier}
                onChange={(e) => setMultiplier(e.target.value)}
              />
            </Field>
            <Field
              label="Prix du lot entier"
              htmlFor="salePrice"
              hint="Vide = calculé automatiquement à partir du prix de vente unitaire"
            >
              <Input
                id="salePrice"
                name="salePrice"
                type="number"
                min={0}
                placeholder={suggestedPrice != null ? String(suggestedPrice) : "auto"}
              />
            </Field>
          </div>
          <Field label="Code-barres du conditionnement (facultatif)" htmlFor="barcode">
            <Input id="barcode" name="barcode" placeholder="Scanner ou saisir le code" />
          </Field>
          {suggestedPrice != null && (
            <p className="rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-500">
              1 colis = {multiplier} {baseUnit} — soit {formatMoney(suggestedPrice, currency)} si le prix est laissé
              vide.
            </p>
          )}
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Enregistrement..." : "Ajouter"}
          </Button>
        </form>
      )}

      {units.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-200 p-4 text-center text-sm text-zinc-400">
          Aucun conditionnement — ce produit ne se vend qu&apos;à l&apos;unité.
        </p>
      ) : (
        <ul className="space-y-2">
          {units.map((u) =>
            editingId === u.id ? (
              <li key={u.id}>
                <form
                  action={(fd) => handleUpdate(u.id, fd)}
                  className="grid grid-cols-1 gap-3 rounded-xl border border-zindo-green-300 bg-zindo-green-50/40 p-3 sm:grid-cols-4"
                >
                  <Input name="name" defaultValue={u.name} required />
                  <Input name="multiplier" type="number" min={1} step="any" defaultValue={u.multiplier} required />
                  <Input name="salePrice" type="number" min={0} defaultValue={u.salePrice} required />
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" disabled={pending}>
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => setEditingId(null)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </form>
              </li>
            ) : (
              <li key={u.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-200 p-3">
                <div>
                  <p className="font-medium text-zinc-900">{u.name}</p>
                  <p className="text-xs text-zinc-500">
                    1 colis = {u.multiplier} {baseUnit} · {formatMoney(u.salePrice, currency)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {u.barcode ? (
                    <Badge tone="emerald">Code enregistré</Badge>
                  ) : (
                    <Badge tone="zinc">
                      <QrCode className="h-3 w-3" /> Sans QR code
                    </Badge>
                  )}
                  <button
                    type="button"
                    onClick={() => setEditingId(u.id)}
                    className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                    aria-label="Modifier"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(u.id)}
                    disabled={pending}
                    className="rounded-lg p-1.5 text-red-400 hover:bg-red-50"
                    aria-label="Supprimer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            )
          )}
        </ul>
      )}
    </div>
  );
}
