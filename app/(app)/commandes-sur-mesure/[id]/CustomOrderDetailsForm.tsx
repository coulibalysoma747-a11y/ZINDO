"use client";

import { useState, useTransition } from "react";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { updateCustomOrderDetailsAction } from "@/lib/actions/custom-orders";

export function CustomOrderDetailsForm({
  orderId,
  specifications,
  agreedPrice,
  discount,
  deliveryDate,
  technicianId,
  technicians,
  currency,
  disabled,
}: {
  orderId: string;
  specifications: string | null;
  agreedPrice: number;
  discount: number;
  deliveryDate: string | null;
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
      const result = await updateCustomOrderDetailsAction(orderId, formData);
      if (result?.error) setError(result.error);
      else setSuccess(result?.success ?? null);
    });
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <Field label="Spécifications" htmlFor="specifications">
        <Textarea id="specifications" name="specifications" rows={3} defaultValue={specifications ?? ""} disabled={disabled} />
      </Field>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label={`Prix convenu (${currency === "XOF" ? "FCFA" : currency})`} htmlFor="agreedPrice">
          <Input id="agreedPrice" name="agreedPrice" type="number" min={0} step="1" defaultValue={agreedPrice} disabled={disabled} />
        </Field>
        <Field label="Remise" htmlFor="discount">
          <Input id="discount" name="discount" type="number" min={0} step="1" defaultValue={discount} disabled={disabled} />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Livraison prévue le" htmlFor="deliveryDate">
          <Input id="deliveryDate" name="deliveryDate" type="date" defaultValue={deliveryDate ?? ""} disabled={disabled} />
        </Field>
        <Field label="Artisan assigné" htmlFor="technicianId">
          <Select id="technicianId" name="technicianId" defaultValue={technicianId} disabled={disabled}>
            <option value="">Non assigné</option>
            {technicians.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>

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
