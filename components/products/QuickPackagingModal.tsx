"use client";

import { useState, useTransition } from "react";
import { PackagePlus } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Field, Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { formatMoney } from "@/lib/format";
import { PackagingTypePicker } from "@/components/products/PackagingTypePicker";
import { addPackagingUnitAction } from "@/lib/actions/packaging-units";

/** Ajout rapide d'un conditionnement directement depuis la liste des produits, sans ouvrir la fiche du produit. */
export function QuickPackagingButton({
  productId,
  productName,
  baseUnit,
  basePrice,
  currency,
}: {
  productId: string;
  productName: string;
  baseUnit: string;
  basePrice: number;
  currency: string;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [multiplier, setMultiplier] = useState("");
  const [pending, startTransition] = useTransition();

  const suggestedPrice = Number(multiplier) > 0 ? Math.round(Number(multiplier) * basePrice) : null;

  function handleSubmit(formData: FormData) {
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
      setOpen(false);
      setMultiplier("");
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg p-1.5 text-orange-500 hover:bg-orange-50"
        aria-label="Ajouter un conditionnement"
        title="Ajouter un conditionnement"
      >
        <PackagePlus className="h-4 w-4" />
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title={`Nouveau conditionnement — ${productName}`}>
        <form action={handleSubmit} className="space-y-4">
          <p className="text-xs text-zinc-500">
            Pièce : {formatMoney(basePrice, currency)} / {baseUnit}
          </p>
          <Field label="Type de conditionnement" htmlFor="quick-packaging-name">
            <PackagingTypePicker id="quick-packaging-name" name="name" />
          </Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Nombre de pièces" htmlFor="quick-packaging-multiplier">
              <Input
                id="quick-packaging-multiplier"
                name="multiplier"
                type="number"
                min={1}
                step="any"
                required
                value={multiplier}
                onChange={(e) => setMultiplier(e.target.value)}
              />
            </Field>
            <Field label="Prix du lot entier" htmlFor="quick-packaging-price" hint="Vide = calculé automatiquement">
              <Input
                id="quick-packaging-price"
                name="salePrice"
                type="number"
                min={0}
                placeholder={suggestedPrice != null ? String(suggestedPrice) : "auto"}
              />
            </Field>
          </div>
          <Field label="Code-barres (facultatif)" htmlFor="quick-packaging-barcode">
            <Input id="quick-packaging-barcode" name="barcode" placeholder="Scanner ou saisir le code" />
          </Field>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Enregistrement..." : "Ajouter"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
