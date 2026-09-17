"use client";

import { useActionState, useState } from "react";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { ProductPicker } from "@/components/products/ProductPicker";
import { ProductThumbnail } from "@/components/products/ProductThumbnail";
import { createRentalAction, type ActionState } from "@/lib/actions/rentals";

type SelectedProduct = { id: string; name: string; photoUrl?: string | null };

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function RentalForm({
  customers,
  locations,
  defaultLocationId,
  currency,
}: {
  customers: { id: string; name: string }[];
  locations: { id: string; name: string }[];
  defaultLocationId?: string;
  currency: string;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(createRentalAction, undefined);
  const [locationId, setLocationId] = useState(defaultLocationId ?? locations[0]?.id ?? "");
  const [product, setProduct] = useState<SelectedProduct | null>(null);

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

          <Field label="Produit à louer" htmlFor="productSearch">
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
                onSelect={(p) => setProduct({ id: p.id, name: p.name, photoUrl: p.photoUrl })}
              />
            )}
          </Field>

          <Field label="Client (facultatif)" htmlFor="customerId">
            <Select id="customerId" name="customerId" defaultValue="">
              <option value="">Sans client</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Quantité" htmlFor="quantity">
              <Input id="quantity" name="quantity" type="number" min={1} defaultValue={1} required />
            </Field>
            <Field label={`Tarif / jour (${currency === "XOF" ? "FCFA" : currency})`} htmlFor="dailyRate">
              <Input id="dailyRate" name="dailyRate" type="number" min={0} step="1" defaultValue={0} required />
            </Field>
          </div>

          <Field label={`Caution (${currency === "XOF" ? "FCFA" : currency})`} htmlFor="deposit">
            <Input id="deposit" name="deposit" type="number" min={0} step="1" defaultValue={0} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Date de début" htmlFor="startDate">
              <Input id="startDate" name="startDate" type="date" defaultValue={todayIso()} required />
            </Field>
            <Field label="Retour prévu le" htmlFor="expectedReturnDate">
              <Input id="expectedReturnDate" name="expectedReturnDate" type="date" defaultValue={todayIso()} required />
            </Field>
          </div>

          <Field label="Note (facultatif)" htmlFor="note">
            <Textarea id="note" name="note" rows={2} />
          </Field>

          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

          <Button type="submit" disabled={pending || !product} className="w-full">
            {pending ? "Création..." : "Créer la location"}
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}
