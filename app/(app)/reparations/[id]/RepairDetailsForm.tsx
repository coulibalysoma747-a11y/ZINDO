"use client";

import { useState, useTransition } from "react";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { updateRepairDetailsAction } from "@/lib/actions/repairs";

export function RepairDetailsForm({
  ticketId,
  diagnosis,
  laborCost,
  discount,
  technicianId,
  technicians,
  currency,
  disabled,
}: {
  ticketId: string;
  diagnosis: string | null;
  laborCost: number;
  discount: number;
  technicianId: string;
  technicians: { id: string; name: string }[];
  currency: string;
  disabled: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await updateRepairDetailsAction(ticketId, formData);
      if (result?.error) setError(result.error);
      else setSuccess(result?.success ?? null);
    });
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <Field label="Diagnostic" htmlFor="diagnosis">
        <Textarea id="diagnosis" name="diagnosis" rows={3} defaultValue={diagnosis ?? ""} disabled={disabled} />
      </Field>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label={`Main-d'œuvre (${currency === "XOF" ? "FCFA" : currency})`} htmlFor="laborCost">
          <Input id="laborCost" name="laborCost" type="number" min={0} step="1" defaultValue={laborCost} disabled={disabled} />
        </Field>
        <Field label="Remise" htmlFor="discount">
          <Input id="discount" name="discount" type="number" min={0} step="1" defaultValue={discount} disabled={disabled} />
        </Field>
      </div>

      <Field label="Technicien assigné" htmlFor="technicianId">
        <Select id="technicianId" name="technicianId" defaultValue={technicianId} disabled={disabled}>
          <option value="">Non assigné</option>
          {technicians.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </Select>
      </Field>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-emerald-600">{success}</p>}

      {!disabled && (
        <Button type="submit" variant="outline" disabled={pending}>
          {pending ? "Enregistrement..." : "Enregistrer"}
        </Button>
      )}
    </form>
  );
}
