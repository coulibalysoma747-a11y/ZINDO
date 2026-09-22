"use client";

import { useActionState, useState } from "react";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { createCustomOrderAction, type ActionState } from "@/lib/actions/custom-orders";

export function CustomOrderForm({
  customers,
  technicians,
  locations,
  defaultLocationId,
}: {
  customers: { id: string; name: string }[];
  technicians: { id: string; name: string }[];
  locations: { id: string; name: string }[];
  defaultLocationId?: string;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(createCustomOrderAction, undefined);
  const [locationId, setLocationId] = useState(defaultLocationId ?? locations[0]?.id ?? "");

  return (
    <Card>
      <CardBody>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="locationId" value={locationId} />

          <Field label="Boutique / atelier" htmlFor="locationSelect">
            <Select id="locationSelect" value={locationId} onChange={(e) => setLocationId(e.target.value)}>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Client" htmlFor="customerId">
            <Select id="customerId" name="customerId" defaultValue="" required>
              <option value="" disabled>
                Choisir un client
              </option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Pièce à réaliser" htmlFor="itemDescription" hint='Ex. « Costume homme », « Table basse en bois »'>
            <Input id="itemDescription" name="itemDescription" required autoFocus />
          </Field>

          <Field label="Spécifications (mesures, tissu, modèle...)" htmlFor="specifications">
            <Textarea id="specifications" name="specifications" rows={3} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Prix convenu" htmlFor="agreedPrice">
              <Input id="agreedPrice" name="agreedPrice" type="number" min={0} step="1" defaultValue={0} />
            </Field>
            <Field label="Livraison prévue le" htmlFor="deliveryDate">
              <Input id="deliveryDate" name="deliveryDate" type="date" />
            </Field>
          </div>

          <Field label="Artisan assigné (facultatif)" htmlFor="technicianId">
            <Select id="technicianId" name="technicianId" defaultValue="">
              <option value="">Non assigné</option>
              {technicians.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Note interne (facultatif)" htmlFor="note">
            <Textarea id="note" name="note" rows={2} />
          </Field>

          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Création..." : "Créer la commande"}
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}
