"use client";

import { useActionState, useState } from "react";
import { createConsultationAction } from "@/lib/actions/consultations";
import type { MedicalAct } from "@/lib/actions/medical-acts";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function ConsultationForm({ medicalActs }: { medicalActs: MedicalAct[] }) {
  const [state, action, pending] = useActionState(createConsultationAction, undefined);
  const [fee, setFee] = useState(0);

  function handleActChange(actId: string) {
    const act = medicalActs.find((a) => a.id === actId);
    if (act) setFee(act.defaultFee);
  }

  return (
    <form action={action} className="space-y-4">
      <Field label="Code / numéro du patient (facultatif)" htmlFor="patientCode">
        <Input id="patientCode" name="patientCode" placeholder="Ex: PAT-001" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Nom du patient (facultatif)" htmlFor="patientName">
          <Input id="patientName" name="patientName" placeholder="Ex: Awa Ouédraogo" />
        </Field>
        <Field label="Âge du patient (facultatif)" htmlFor="patientAge">
          <Input id="patientAge" name="patientAge" type="number" min={0} max={130} step={1} placeholder="Ex: 34" />
        </Field>
      </div>
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
      {medicalActs.length > 0 && (
        <Field label="Acte médical (facultatif — pré-remplit les frais)" htmlFor="actId">
          <Select id="actId" name="actId" defaultValue="" onChange={(e) => handleActChange(e.target.value)}>
            <option value="">Aucun / saisie libre</option>
            {medicalActs.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <Field label="Diagnostic / pathologie" htmlFor="diagnosis">
        <Input id="diagnosis" name="diagnosis" placeholder="Ex: Paludisme" required />
      </Field>
      <Field label="Traitement (facultatif)" htmlFor="treatment">
        <Textarea id="treatment" name="treatment" rows={3} placeholder="Ordonnance ou soins administrés" />
      </Field>
      <Field label="Frais de consultation (FCFA)" htmlFor="fee">
        <Input
          id="fee"
          name="fee"
          type="number"
          min={0}
          step={1}
          required
          value={fee}
          onChange={(e) => setFee(Number(e.target.value))}
        />
      </Field>
      {state?.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Enregistrement..." : "Enregistrer la consultation"}
      </Button>
    </form>
  );
}
