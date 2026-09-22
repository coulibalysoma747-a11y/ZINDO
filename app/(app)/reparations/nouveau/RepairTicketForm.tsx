"use client";

import { useActionState, useState } from "react";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { createRepairTicketAction, type ActionState } from "@/lib/actions/repairs";

export function RepairTicketForm({
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
  const [state, formAction, pending] = useActionState<ActionState, FormData>(createRepairTicketAction, undefined);
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

          <Field label="Type d'appareil / engin" htmlFor="deviceType" hint="Ex. « Moto Sanili », « Téléphone Tecno », « Groupe électrogène »">
            <Input id="deviceType" name="deviceType" required autoFocus />
          </Field>

          <Field label="Description (marque, modèle, immatriculation, IMEI...)" htmlFor="deviceDescription">
            <Input id="deviceDescription" name="deviceDescription" />
          </Field>

          <Field label="Panne signalée par le client" htmlFor="reportedIssue">
            <Textarea id="reportedIssue" name="reportedIssue" rows={3} required />
          </Field>

          <Field label="Technicien assigné (facultatif)" htmlFor="technicianId">
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
            {pending ? "Création..." : "Créer le bon"}
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}
