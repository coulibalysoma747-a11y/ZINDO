"use client";

import { useActionState } from "react";
import { createConsultationAction } from "@/lib/actions/consultations";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function ConsultationForm() {
  const [state, action, pending] = useActionState(createConsultationAction, undefined);

  return (
    <form action={action} className="space-y-4">
      <Field label="Code / numéro du patient (facultatif)" htmlFor="patientCode">
        <Input id="patientCode" name="patientCode" placeholder="Ex: PAT-001" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Sexe" htmlFor="sex">
          <Select id="sex" name="sex" required defaultValue="">
            <option value="" disabled>
              Choisir
            </option>
            <option value="M">Masculin</option>
            <option value="F">Féminin</option>
          </Select>
        </Field>
        <Field label="Tranche d'âge" htmlFor="ageGroup">
          <Select id="ageGroup" name="ageGroup" required defaultValue="">
            <option value="" disabled>
              Choisir
            </option>
            <option value="ENFANT">Enfant</option>
            <option value="ADULTE">Adulte</option>
            <option value="SENIOR">Senior</option>
          </Select>
        </Field>
      </div>
      <Field label="Diagnostic / pathologie" htmlFor="diagnosis">
        <Input id="diagnosis" name="diagnosis" placeholder="Ex: Paludisme" required />
      </Field>
      <Field label="Traitement (facultatif)" htmlFor="treatment">
        <Textarea id="treatment" name="treatment" rows={3} placeholder="Ordonnance ou soins administrés" />
      </Field>
      <Field label="Frais de consultation (FCFA)" htmlFor="fee">
        <Input id="fee" name="fee" type="number" min={0} step={1} required defaultValue={0} />
      </Field>
      {state?.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Enregistrement..." : "Enregistrer la consultation"}
      </Button>
    </form>
  );
}
