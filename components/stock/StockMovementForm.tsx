"use client";

import { useActionState, useState } from "react";
import { ProductPicker } from "@/components/products/ProductPicker";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { Button, ButtonLink } from "@/components/ui/Button";
import { createStockMovementAction, type ActionState } from "@/lib/actions/stock";

const IN_REASONS = [
  { value: "ACHAT", label: "Achat" },
  { value: "RETOUR_CLIENT", label: "Retour client" },
  { value: "CORRECTION", label: "Correction de stock" },
  { value: "INVENTAIRE", label: "Inventaire" },
  { value: "AUTRE", label: "Autre" },
];

const OUT_REASONS = [
  { value: "PRODUIT_ENDOMMAGE", label: "Produit endommagé" },
  { value: "PERTE", label: "Perte" },
  { value: "RETOUR_FOURNISSEUR", label: "Retour fournisseur" },
  { value: "CORRECTION", label: "Correction de stock" },
  { value: "AUTRE", label: "Autre" },
];

type Product = {
  id: string;
  name: string;
  reference: string;
  quantity: number;
  unit: string;
  salePrice: number;
  purchasePrice: number;
};

export function StockMovementForm({
  direction,
  initialProduct,
  locations,
  defaultLocationId,
  currency,
}: {
  direction: "IN" | "OUT";
  initialProduct: Product | null;
  locations: { id: string; name: string }[];
  defaultLocationId?: string;
  currency: string;
}) {
  const [locationId, setLocationId] = useState(defaultLocationId ?? locations[0]?.id ?? "");
  const [product, setProduct] = useState<Product | null>(initialProduct);
  const action = createStockMovementAction.bind(null, direction);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, undefined);
  const reasons = direction === "IN" ? IN_REASONS : OUT_REASONS;

  return (
    <div className="max-w-xl space-y-4">
      <Field label="Boutique" htmlFor="location-select">
        <Select
          id="location-select"
          value={locationId}
          onChange={(e) => {
            setLocationId(e.target.value);
            setProduct(null);
          }}
        >
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </Select>
      </Field>

      <div>
        <Field label="Produit" htmlFor="product-picker">
          <ProductPicker
            onSelect={setProduct}
            locationId={locationId}
            currency={currency}
            placeholder="Rechercher le produit concerné..."
          />
        </Field>
        {product && (
          <p className="mt-2 rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-600">
            <span className="font-medium text-zinc-900">{product.name}</span> — Stock actuel :{" "}
            {product.quantity} {product.unit}
          </p>
        )}
      </div>

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="productId" value={product?.id ?? ""} />
        <input type="hidden" name="locationId" value={locationId} />
        <Field label="Quantité" htmlFor="quantity">
          <Input id="quantity" name="quantity" type="number" min={1} required />
        </Field>
        <Field label="Motif" htmlFor="reason">
          <Select id="reason" name="reason" required>
            <option value="">Sélectionner un motif</option>
            {reasons.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Note (facultatif)" htmlFor="note">
          <Textarea id="note" name="note" rows={2} />
        </Field>
        {state?.error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
        )}
        <div className="flex justify-end gap-2">
          <ButtonLink href="/stock" variant="outline">
            Annuler
          </ButtonLink>
          <Button type="submit" disabled={pending || !product}>
            {pending ? "Enregistrement..." : direction === "IN" ? "Enregistrer l'entrée" : "Enregistrer la sortie"}
          </Button>
        </div>
      </form>
    </div>
  );
}
