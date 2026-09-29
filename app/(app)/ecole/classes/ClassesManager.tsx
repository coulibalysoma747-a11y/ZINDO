"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { Field, Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { EmptyState } from "@/components/ui/Empty";
import { formatMoney, currencyLabel, moneyStep } from "@/lib/format";
import { saveSchoolClassAction, deleteSchoolClassAction, type ActionState, type SchoolClass } from "@/lib/actions/school";

export function ClassesManager({ classes, currency }: { classes: SchoolClass[]; currency: string }) {
  const [editing, setEditing] = useState<SchoolClass | null>(null);
  // « n » change à chaque enregistrement réussi : il sert de clé pour vider le formulaire.
  const [state, formAction, pending] = useActionState<(ActionState & { n?: number }) | undefined, FormData>(async (prev, fd) => {
    const res = await saveSchoolClassAction(prev, fd);
    if (!res?.success) return { ...res, n: prev?.n };
    setEditing(null);
    return { ...res, n: (prev?.n ?? 0) + 1 };
  }, undefined);
  const unit = currencyLabel(currency);

  return (
    <div className="space-y-6">
      <Card>
        <CardBody>
          <form key={`${state?.n ?? 0}-${editing?.id ?? "new"}`} action={formAction} className="space-y-4">
            {editing && <input type="hidden" name="id" value={editing.id} />}
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Nom de la classe" htmlFor="name">
                <Input id="name" name="name" placeholder="Ex. CM2 A, 6e B, Tle D" defaultValue={editing?.name} required />
              </Field>
              <Field label="Niveau (facultatif)" htmlFor="level">
                <Input id="level" name="level" placeholder="Primaire, collège, lycée…" defaultValue={editing?.level ?? ""} />
              </Field>
              <Field label={`Scolarité annuelle (${unit})`} htmlFor="annualFee">
                <Input id="annualFee" name="annualFee" type="number" inputMode="decimal" min={0} step={moneyStep(currency)} defaultValue={editing?.annualFee ?? 0} />
              </Field>
            </div>
            {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
            {state?.success && <p className="text-sm text-emerald-600">{state.success}</p>}
            <div className="flex gap-2">
              <Button type="submit" disabled={pending}>
                {pending ? "Enregistrement..." : editing ? "Enregistrer les modifications" : "Ajouter la classe"}
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

      {classes.length === 0 ? (
        <EmptyState title="Aucune classe" description="Ajoutez votre première classe ci-dessus." />
      ) : (
        <Card className="divide-y divide-zinc-100">
          {classes.map((c) => (
            <CardBody key={c.id} className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <Link href={`/ecole/classes/${c.id}`} className="font-medium text-zinc-900 hover:underline">
                  {c.name}
                </Link>
                <p className="text-xs text-zinc-500">
                  {c.level ? `${c.level} · ` : ""}
                  {c.studentCount} élève{c.studentCount > 1 ? "s" : ""} · {formatMoney(c.annualFee, currency)} / an
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setEditing(c)} className="text-zinc-400 hover:text-zinc-700" aria-label="Modifier">
                  <Pencil className="h-4 w-4" />
                </button>
                <ConfirmButton
                  label={<Trash2 className="h-4 w-4" />}
                  className="text-zinc-400 hover:text-red-600"
                  confirmTitle="Supprimer la classe"
                  confirmMessage={`Supprimer la classe « ${c.name} » ?`}
                  action={() => deleteSchoolClassAction(c.id)}
                />
              </div>
            </CardBody>
          ))}
        </Card>
      )}
    </div>
  );
}
