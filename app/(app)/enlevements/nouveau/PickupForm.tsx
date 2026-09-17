"use client";

import { useActionState, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { ProductPicker } from "@/components/products/ProductPicker";
import { ProductThumbnail } from "@/components/products/ProductThumbnail";
import { createPickupAction, type ActionState } from "@/lib/actions/pickups";
import { formatMoney } from "@/lib/format";

type SelectedProduct = { id: string; name: string; photoUrl?: string | null; purchasePrice: number };

export function PickupForm({
  locations,
  defaultLocationId,
  currency,
}: {
  locations: { id: string; name: string }[];
  defaultLocationId?: string;
  currency: string;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(createPickupAction, undefined);
  const [locationId, setLocationId] = useState(defaultLocationId ?? locations[0]?.id ?? "");
  const [product, setProduct] = useState<SelectedProduct | null>(null);
  const [unitPrice, setUnitPrice] = useState("");

  const belowCost = product && unitPrice !== "" && Number(unitPrice) < product.purchasePrice;

  return (
    <Card>
      <CardBody>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="locationId" value={locationId} />
          <input type="hidden" name="productId" value={product?.id ?? ""} />

          <Field label="Boutique" htmlFor="locationSelect">
            <Select id="locationSelect" value={locationId} onChange={(e) => setLocationId(e.target.value)}>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Confrère (partenaire)" htmlFor="partnerName">
            <Input id="partnerName" name="partnerName" placeholder="Ex : Ali" required />
          </Field>
          <Field label="Téléphone (facultatif, pour le rappel WhatsApp)" htmlFor="partnerPhone">
            <Input id="partnerPhone" name="partnerPhone" placeholder="Ex : 70 00 00 00" />
          </Field>

          <Field label="Produit pris" htmlFor="productSearch">
            {product ? (
              <div className="flex items-center justify-between rounded-lg border border-zinc-200 p-2">
                <div className="flex items-center gap-2">
                  <ProductThumbnail photoUrl={product.photoUrl} name={product.name} size={36} />
                  <span className="text-sm font-medium text-zinc-900">{product.name}</span>
                </div>
                <button type="button" onClick={() => setProduct(null)} className="text-xs text-zinc-400 hover:text-red-600">
                  Changer
                </button>
              </div>
            ) : (
              <ProductPicker
                locationId={locationId}
                currency={currency}
                onSelect={(p) => setProduct({ id: p.id, name: p.name, photoUrl: p.photoUrl, purchasePrice: p.purchasePrice })}
              />
            )}
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Quantité" htmlFor="quantity">
              <Input id="quantity" name="quantity" type="number" min={1} defaultValue={1} required />
            </Field>
            <Field label={`Prix consenti / pièce (${currency === "XOF" ? "FCFA" : currency})`} htmlFor="unitPrice">
              <Input
                id="unitPrice"
                name="unitPrice"
                type="number"
                min={0}
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                required
              />
            </Field>
          </div>

          {belowCost && (
            <p className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              Ce prix ({formatMoney(Number(unitPrice), currency)}) est sous votre prix d&apos;achat (
              {formatMoney(product.purchasePrice, currency)}).
            </p>
          )}

          <Field label="Montant laissé maintenant (0 si tout est dû)" htmlFor="amountPaid">
            <Input id="amountPaid" name="amountPaid" type="number" min={0} defaultValue={0} />
          </Field>

          <Field label="Note (facultatif)" htmlFor="note">
            <Textarea id="note" name="note" rows={2} placeholder="Ex : paiera le reste vendredi" />
          </Field>

          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

          <Button type="submit" disabled={pending || !product} className="w-full">
            {pending ? "Enregistrement..." : "Enregistrer l'enlèvement"}
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}
