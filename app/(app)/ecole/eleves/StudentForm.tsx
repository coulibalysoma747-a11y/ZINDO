"use client";

import { useActionState } from "react";
import { Field, Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { saveStudentAction, type ActionState, type StudentRow } from "@/lib/actions/school";
import { useKeepValuesOnError } from "@/lib/keep-form-values";

export function StudentForm({
  classes,
  student,
  currency,
  defaultClassId,
}: {
  classes: { id: string; name: string }[];
  student?: StudentRow;
  currency: string;
  defaultClassId?: string;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(saveStudentAction, undefined);
  const keep = useKeepValuesOnError(state);
  const unit = currency === "XOF" ? "FCFA" : currency;

  return (
    <Card>
      <CardBody>
        <form onSubmit={keep} action={formAction} className="space-y-4">
          {student && <input type="hidden" name="id" value={student.id} />}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nom" htmlFor="lastName">
              <Input id="lastName" name="lastName" defaultValue={student?.lastName} required />
            </Field>
            <Field label="Prénom(s)" htmlFor="firstName">
              <Input id="firstName" name="firstName" defaultValue={student?.firstName} required />
            </Field>
            <Field label="Classe" htmlFor="classId">
              <Select id="classId" name="classId" defaultValue={student?.classId ?? defaultClassId ?? ""}>
                <option value="">Sans classe</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Matricule" htmlFor="matricule" hint={student ? undefined : "Laissez vide : il sera créé automatiquement."}>
              <Input id="matricule" name="matricule" defaultValue={student?.matricule ?? ""} />
            </Field>
            <Field label="Sexe" htmlFor="sex">
              <Select id="sex" name="sex" defaultValue={student?.sex ?? ""}>
                <option value="">Non précisé</option>
                <option value="M">Garçon</option>
                <option value="F">Fille</option>
              </Select>
            </Field>
            <Field label="Date de naissance (facultatif)" htmlFor="birthDate">
              <Input id="birthDate" name="birthDate" type="date" defaultValue={student?.birthDate ?? ""} />
            </Field>
            <Field label="Lieu de naissance (facultatif)" htmlFor="birthPlace">
              <Input id="birthPlace" name="birthPlace" defaultValue={student?.birthPlace ?? ""} />
            </Field>
            <Field label="Adresse / quartier (facultatif)" htmlFor="address">
              <Input id="address" name="address" defaultValue={student?.address ?? ""} />
            </Field>
            <Field label="Nom du parent / tuteur" htmlFor="parentName">
              <Input id="parentName" name="parentName" defaultValue={student?.parentName ?? ""} />
            </Field>
            <Field label="Téléphone du parent" htmlFor="parentPhone">
              <Input id="parentPhone" name="parentPhone" type="tel" defaultValue={student?.parentPhone ?? ""} />
            </Field>
            <Field label="WhatsApp du parent (si différent)" htmlFor="parentWhatsapp">
              <Input id="parentWhatsapp" name="parentWhatsapp" type="tel" defaultValue={student?.parentWhatsapp ?? ""} />
            </Field>
            <Field label="Lien avec l'élève" htmlFor="parentRelation">
              <Input id="parentRelation" name="parentRelation" placeholder="Père, mère, oncle, tuteur…" defaultValue={student?.parentRelation ?? ""} />
            </Field>
            <Field label="Date d'inscription" htmlFor="enrolledAt">
              <Input id="enrolledAt" name="enrolledAt" type="date" defaultValue={student?.enrolledAt ?? new Date().toISOString().slice(0, 10)} />
            </Field>
          </div>

          <Field
            label={`Scolarité propre à l'élève (${unit}, facultatif)`}
            htmlFor="customFee"
            hint="Laissez vide pour appliquer le montant de la classe. Utile pour une réduction ou une bourse."
          >
            <Input id="customFee" name="customFee" type="number" min={0} step="1" defaultValue={student?.customFee ?? ""} />
          </Field>

          {student && (
            <Field label="Situation" htmlFor="active">
              <Select id="active" name="active" defaultValue={student.active ? "on" : "off"}>
                <option value="on">Inscrit</option>
                <option value="off">Parti (n&apos;apparaît plus dans les impayés)</option>
              </Select>
            </Field>
          )}

          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Enregistrement..." : student ? "Enregistrer les modifications" : "Inscrire l'élève"}
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}
