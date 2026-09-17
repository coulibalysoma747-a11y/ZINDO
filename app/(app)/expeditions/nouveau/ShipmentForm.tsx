"use client";

import { useActionState, useState } from "react";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { createShipmentAction, type ActionState } from "@/lib/actions/shipments";

export function ShipmentForm({
  locations,
  defaultLocationId,
}: {
  locations: { id: string; name: string }[];
  defaultLocationId?: string;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(createShipmentAction, undefined);
  const [locationId, setLocationId] = useState(defaultLocationId ?? locations[0]?.id ?? "");

  return (
    <Card>
      <CardBody>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="locationId" value={locationId} />

          <Field label="Boutique" htmlFor="locationSelect">
            <Select id="locationSelect" value={locationId} onChange={(e) => setLocationId(e.target.value)}>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Transporteur" htmlFor="carrierName">
            <Input id="carrierName" name="carrierName" placeholder="Ex : STAF, Rakieta..." required />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="N° de bordereau (facultatif)" htmlFor="waybillNumber">
              <Input id="waybillNumber" name="waybillNumber" />
            </Field>
            <Field label="Frais de transport" htmlFor="cost">
              <Input id="cost" name="cost" type="number" min={0} defaultValue={0} required />
            </Field>
          </div>

          <Field label="Destination (facultatif)" htmlFor="destination">
            <Input id="destination" name="destination" placeholder="Ex : Fada N'Gourma" />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Destinataire (facultatif)" htmlFor="recipientName">
              <Input id="recipientName" name="recipientName" />
            </Field>
            <Field label="Téléphone destinataire" htmlFor="recipientPhone">
              <Input id="recipientPhone" name="recipientPhone" placeholder="Pour le message de suivi" />
            </Field>
          </div>

          <Field label="Note (facultatif)" htmlFor="note">
            <Textarea id="note" name="note" rows={2} />
          </Field>

          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Enregistrement..." : "Enregistrer l'expédition"}
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}
