"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Field, Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { EmptyState } from "@/components/ui/Empty";
import { saveTeacherAction, deleteTeacherAction, type Teacher } from "@/lib/actions/school-staff";
import { useResettingAction } from "@/components/school/useResettingAction";

export function TeachersManager({
  teachers,
  users,
  month,
}: {
  teachers: Teacher[];
  users: { id: string; name: string; phone: string | null }[];
  month: Record<string, { absences: number; retards: number }>;
}) {
  const [editing, setEditing] = useState<Teacher | null>(null);
  const [state, formAction, pending] = useResettingAction(saveTeacherAction, () => setEditing(null));

  return (
    <div className="space-y-6">
      <Card>
        <CardBody>
          <h2 className="mb-3 font-semibold text-zinc-900">{editing ? `Modifier ${editing.lastName} ${editing.firstName}` : "Ajouter un enseignant"}</h2>
          <form key={`${state?.n ?? 0}-${editing?.id ?? "new"}`} action={formAction} className="space-y-4">
            {editing && <input type="hidden" name="id" value={editing.id} />}
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nom" htmlFor="lastName">
                <Input id="lastName" name="lastName" defaultValue={editing?.lastName} required />
              </Field>
              <Field label="Prénom(s)" htmlFor="firstName">
                <Input id="firstName" name="firstName" defaultValue={editing?.firstName} required />
              </Field>
              <Field label="Téléphone" htmlFor="phone">
                <Input id="phone" name="phone" type="tel" defaultValue={editing?.phone ?? ""} />
              </Field>
              <Field label="WhatsApp" htmlFor="whatsapp">
                <Input id="whatsapp" name="whatsapp" type="tel" defaultValue={editing?.whatsapp ?? ""} />
              </Field>
              <Field label="E-mail (facultatif)" htmlFor="email">
                <Input id="email" name="email" type="email" defaultValue={editing?.email ?? ""} />
              </Field>
              <Field label="Fonction" htmlFor="function">
                <Input id="function" name="function" placeholder="Enseignant, professeur principal, surveillant…" defaultValue={editing?.function ?? ""} />
              </Field>
              <Field label="Date d'entrée" htmlFor="hireDate">
                <Input id="hireDate" name="hireDate" type="date" defaultValue={editing?.hireDate ?? ""} />
              </Field>
              <Field label="Compte ZINDO de l'enseignant" htmlFor="userId" hint="Créez d'abord son compte dans Utilisateurs, avec le droit « Enseigner ».">
                <Select id="userId" name="userId" defaultValue={editing?.userId ?? ""}>
                  <option value="">Aucun compte (fiche seule)</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                      {u.phone ? ` · ${u.phone}` : ""}
                    </option>
                  ))}
                </Select>
              </Field>
              {editing && (
                <Field label="Situation" htmlFor="active">
                  <Select id="active" name="active" defaultValue={editing.active ? "on" : "off"}>
                    <option value="on">En poste</option>
                    <option value="off">Parti</option>
                  </Select>
                </Field>
              )}
            </div>
            {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
            {state?.success && <p className="text-sm text-emerald-600">{state.success}</p>}
            <div className="flex gap-2">
              <Button type="submit" disabled={pending}>
                {pending ? "Enregistrement..." : editing ? "Enregistrer les modifications" : "Ajouter l'enseignant"}
              </Button>
              {editing && (
                <Button type="button" variant="secondary" onClick={() => setEditing(null)}>
                  Annuler
                </Button>
              )}
            </div>
          </form>
        </CardBody>
      </Card>

      {teachers.length === 0 ? (
        <EmptyState title="Aucun enseignant" description="Ajoutez vos enseignants, puis attribuez-leur des matières dans chaque classe." />
      ) : (
        <Card className="divide-y divide-zinc-100">
          {teachers.map((t) => (
            <CardBody key={t.id} className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-zinc-900">
                  {t.lastName} {t.firstName} {!t.active && <Badge tone="zinc">Parti</Badge>}
                </p>
                <p className="text-xs text-zinc-500">
                  {[t.function, t.phone, t.userName ? `compte : ${t.userName}` : "sans compte"].filter(Boolean).join(" · ")}
                </p>
                {t.assignments.length > 0 && <p className="text-xs text-zinc-400">{t.assignments.join(", ")}</p>}
              </div>
              <div className="flex items-center gap-3">
                {month[t.id] && (
                  <Badge tone="amber">
                    Ce mois : {month[t.id].absences} abs. · {month[t.id].retards} ret.
                  </Badge>
                )}
                <button type="button" onClick={() => setEditing(t)} className="text-zinc-400 hover:text-zinc-700" aria-label="Modifier">
                  <Pencil className="h-4 w-4" />
                </button>
                <ConfirmButton
                  label={<Trash2 className="h-4 w-4" />}
                  className="text-zinc-400 hover:text-red-600"
                  confirmTitle="Supprimer l'enseignant"
                  confirmMessage={`Supprimer ${t.lastName} ${t.firstName} ? Ses cours restent, sans enseignant.`}
                  action={() => deleteTeacherAction(t.id)}
                />
              </div>
            </CardBody>
          ))}
        </Card>
      )}
    </div>
  );
}
