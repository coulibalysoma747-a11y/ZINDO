"use client";

import { currencyLabel, moneyStep } from "@/lib/format";
import { useActionState, useState } from "react";
import { Field, Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { addStudentPaymentAction, type ActionState } from "@/lib/actions/school";
import { SCHOOL_PAYMENT_METHODS, SCHOOL_FEE_TYPES, type SchoolFeeType } from "@/lib/school-constants";

export function PaymentForm({
  studentId,
  currency,
  dueByType,
}: {
  studentId: string;
  currency: string;
  /** Reste à payer par type de frais (seuls les types encore dus sont proposés). */
  dueByType: { feeType: SchoolFeeType; left: number }[];
}) {
  const [feeType, setFeeType] = useState<SchoolFeeType>(dueByType[0]?.feeType ?? "SCOLARITE");
  const remaining = dueByType.find((d) => d.feeType === feeType)?.left ?? 0;
  // « n » change à chaque paiement réussi : il sert de clé pour vider le formulaire.
  const [state, formAction, pending] = useActionState<(ActionState & { n?: number }) | undefined, FormData>(async (prev, fd) => {
    const res = await addStudentPaymentAction(prev, fd);
    return res?.success ? { ...res, n: (prev?.n ?? 0) + 1 } : { ...res, n: prev?.n };
  }, undefined);
  const unit = currencyLabel(currency);

  return (
    <Card>
      <CardBody>
        <h2 className="mb-3 font-semibold text-zinc-900">Enregistrer un paiement</h2>
        <form key={state?.n ?? 0} action={formAction} className="space-y-3">
          <input type="hidden" name="studentId" value={studentId} />
          <Field label="Frais payés" htmlFor="feeType">
            <Select id="feeType" name="feeType" value={feeType} onChange={(e) => setFeeType(e.target.value as SchoolFeeType)}>
              {dueByType.map((d) => (
                <option key={d.feeType} value={d.feeType}>
                  {SCHOOL_FEE_TYPES[d.feeType]} — reste {d.left.toLocaleString("fr-FR")} {unit}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={`Montant (${unit})`} htmlFor="amount" hint={`Reste à payer : ${remaining.toLocaleString("fr-FR")} ${unit}`}>
              <Input id="amount" name="amount" type="number" inputMode="decimal" min={1} max={remaining} step={moneyStep(currency)} required />
            </Field>
            <Field label="Moyen de paiement" htmlFor="method">
              <Select id="method" name="method" defaultValue="ESPECES">
                {Object.entries(SCHOOL_PAYMENT_METHODS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Note (facultatif)" htmlFor="note">
            <Input id="note" name="note" placeholder="Ex. 1re tranche" />
          </Field>
          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
          {state?.success && <p className="text-sm text-emerald-600">{state.success}</p>}
          <Button type="submit" disabled={pending}>
            {pending ? "Enregistrement..." : "Enregistrer le paiement"}
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}
