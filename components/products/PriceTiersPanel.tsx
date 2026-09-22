"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { formatMoney } from "@/lib/format";
import {
  addPriceTierAction,
  updatePriceTierAction,
  deletePriceTierAction,
  type PriceTier,
} from "@/lib/actions/price-tiers";

/**
 * Paliers de prix ("prix de gros") d'un produit : à partir d'une quantité
 * donnée, un prix unitaire dégressif s'applique automatiquement à la caisse
 * — voir lib/pricing.ts et lib/actions/price-tiers.ts.
 */
export function PriceTiersPanel({
  productId,
  tiers,
  currency,
  baseUnit,
  basePrice,
}: {
  productId: string;
  tiers: PriceTier[];
  currency: string;
  baseUnit: string;
  basePrice: number;
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleAdd(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await addPriceTierAction(productId, formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      setFormOpen(false);
    });
  }

  function handleUpdate(tierId: string, formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await updatePriceTierAction(tierId, formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      setEditingId(null);
    });
  }

  function handleDelete(tierId: string) {
    if (!confirm("Supprimer ce palier ?")) return;
    setError(null);
    startTransition(async () => {
      const result = await deletePriceTierAction(tierId);
      if (result.error) setError(result.error);
    });
  }

  const sorted = [...tiers].sort((a, b) => a.minQuantity - b.minQuantity);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">
          Prix de base : <span className="font-medium text-zinc-700">{formatMoney(basePrice, currency)}</span> —
          ajoutez des paliers pour un prix dégressif selon la quantité achetée.
        </p>
        <Button size="sm" variant="outline" onClick={() => setFormOpen((v) => !v)}>
          {formOpen ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          {formOpen ? "Annuler" : "Ajouter"}
        </Button>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {formOpen && (
        <form action={handleAdd} className="grid grid-cols-1 gap-3 rounded-xl border border-zinc-200 p-3 sm:grid-cols-3">
          <Field label={`Quantité minimale (${baseUnit})`} htmlFor="minQuantity">
            <Input id="minQuantity" name="minQuantity" type="number" min={1} step={1} required />
          </Field>
          <Field label="Prix unitaire à partir de ce seuil" htmlFor="unitPrice">
            <Input id="unitPrice" name="unitPrice" type="number" min={0} required />
          </Field>
          <div className="flex items-end">
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? "Enregistrement..." : "Ajouter"}
            </Button>
          </div>
        </form>
      )}

      {sorted.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-200 p-4 text-center text-sm text-zinc-400">
          Aucun palier — ce produit se vend toujours au prix de base, quelle que soit la quantité.
        </p>
      ) : (
        <ul className="space-y-2">
          {sorted.map((t) =>
            editingId === t.id ? (
              <li key={t.id}>
                <form
                  action={(fd) => handleUpdate(t.id, fd)}
                  className="grid grid-cols-1 gap-3 rounded-xl border border-zindo-green-300 bg-zindo-green-50/40 p-3 sm:grid-cols-3"
                >
                  <Input name="minQuantity" type="number" min={1} step={1} defaultValue={t.minQuantity} required />
                  <Input name="unitPrice" type="number" min={0} defaultValue={t.unitPrice} required />
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
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-200 p-3">
                <div>
                  <p className="font-medium text-zinc-900">
                    À partir de {t.minQuantity} {baseUnit}
                  </p>
                  <p className="text-xs text-zinc-500">{formatMoney(t.unitPrice, currency)} / {baseUnit}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingId(t.id)}
                    className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                    aria-label="Modifier"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(t.id)}
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
