"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Field, Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { EmptyState } from "@/components/ui/Empty";
import { formatMoney, currencyLabel, moneyStep } from "@/lib/format";
import { SCHOOL_FEE_TYPES } from "@/lib/school-constants";
import { saveSchoolFeeAction, deleteSchoolFeeAction, type SchoolFee } from "@/lib/actions/school";
import { useResettingAction } from "@/components/school/useResettingAction";

export function FeesManager({ fees, classes, currency }: { fees: SchoolFee[]; classes: { id: string; name: string }[]; currency: string }) {
  const [editing, setEditing] = useState<SchoolFee | null>(null);
  const [state, formAction, pending] = useResettingAction(saveSchoolFeeAction, () => setEditing(null));
  const unit = currencyLabel(currency);

  return (
    <div className="space-y-6">
      <Card>
        <CardBody>
          <form key={`${state?.n ?? 0}-${editing?.id ?? "new"}`} action={formAction} className="space-y-4">
            {editing && <input type="hidden" name="id" value={editing.id} />}
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Type de frais" htmlFor="feeType">
                <Select id="feeType" name="feeType" defaultValue={editing?.feeType ?? "INSCRIPTION"}>
                  {Object.entries(SCHOOL_FEE_TYPES)
                    .filter(([k]) => k !== "SCOLARITE")
                    .map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                </Select>
              </Field>
              <Field label="Libellé" htmlFor="label">
                <Input id="label" name="label" placeholder="Ex. Frais d'inscription, Cantine 1er trimestre" defaultValue={editing?.label} required />
              </Field>
              <Field label={`Montant (${unit})`} htmlFor="amount">
                <Input id="amount" name="amount" type="number" inputMode="decimal" min={0} step={moneyStep(currency)} defaultValue={editing?.amount ?? 0} required />
              </Field>
              <Field label="Classe concernée" htmlFor="classId">
                <Select id="classId" name="classId" defaultValue={editing?.classId ?? ""}>
                  <option value="">Toutes les classes</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
            {state?.success && <p className="text-sm text-emerald-600">{state.success}</p>}
            <div className="flex gap-2">
              <Button type="submit" disabled={pending}>
                {pending ? "Enregistrement..." : editing ? "Enregistrer les modifications" : "Ajouter ces frais"}
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

      {fees.length === 0 ? (
        <EmptyState title="Aucun frais supplémentaire" description="Seule la scolarité de chaque classe est demandée pour l'instant." />
      ) : (
        <Card className="divide-y divide-zinc-100">
          {fees.map((f) => (
            <CardBody key={f.id} className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium text-zinc-900">{f.label}</p>
                <p className="text-xs text-zinc-500">
                  {SCHOOL_FEE_TYPES[f.feeType]} · {f.className ?? "Toutes les classes"} · {formatMoney(f.amount, currency)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setEditing(f)} className="text-zinc-400 hover:text-zinc-700" aria-label="Modifier">
                  <Pencil className="h-4 w-4" />
                </button>
                <ConfirmButton
                  label={<Trash2 className="h-4 w-4" />}
                  className="text-zinc-400 hover:text-red-600"
                  confirmTitle="Supprimer ces frais"
                  confirmMessage={`Supprimer « ${f.label} » ? Les paiements déjà reçus restent enregistrés.`}
                  action={() => deleteSchoolFeeAction(f.id)}
                />
              </div>
            </CardBody>
          ))}
        </Card>
      )}
    </div>
  );
}
