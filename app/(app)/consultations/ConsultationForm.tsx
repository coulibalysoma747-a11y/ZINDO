"use client";

import { useActionState, useState } from "react";
import { X } from "lucide-react";
import { createConsultationAction } from "@/lib/actions/consultations";
import type { MedicalAct } from "@/lib/actions/medical-acts";
import type { DiagnosisCategory } from "@/lib/actions/diagnosis-categories";
import { getOrCreateDiagnosisCategoryByNameAction } from "@/lib/actions/diagnosis-categories";
import { EntityQuickSelect } from "@/components/products/EntityQuickSelect";
import { ProductPicker } from "@/components/products/ProductPicker";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

type PrescriptionItem = { productId: string; productName: string; unit: string; quantity: number; posology: string };

export function ConsultationForm({
  medicalActs,
  diagnosisCategories,
  locationId,
  currency,
}: {
  medicalActs: MedicalAct[];
  diagnosisCategories: DiagnosisCategory[];
  locationId: string;
  currency: string;
}) {
  const [state, action, pending] = useActionState(createConsultationAction, undefined);
  const [fee, setFee] = useState(0);
  const [items, setItems] = useState<PrescriptionItem[]>([]);

  function handleActChange(actId: string) {
    const act = medicalActs.find((a) => a.id === actId);
    if (act) setFee(act.defaultFee);
  }

  function addItem(product: { id: string; name: string; unit: string }) {
    if (items.some((i) => i.productId === product.id)) return;
    setItems((cur) => [...cur, { productId: product.id, productName: product.name, unit: product.unit, quantity: 1, posology: "" }]);
  }

  function updateItem(productId: string, patch: Partial<Pick<PrescriptionItem, "quantity" | "posology">>) {
    setItems((cur) => cur.map((i) => (i.productId === productId ? { ...i, ...patch } : i)));
  }

  function removeItem(productId: string) {
    setItems((cur) => cur.filter((i) => i.productId !== productId));
  }

  return (
    <form action={action} className="space-y-4">
      <p className="text-xs text-zinc-500">
        Le numéro du patient (ex. PAT-00001) est généré automatiquement à l&apos;enregistrement.
      </p>
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
        <EntityQuickSelect
          id="diagnosis"
          name="diagnosis"
          options={diagnosisCategories}
          onCreate={getOrCreateDiagnosisCategoryByNameAction}
          submitValue="name"
          emptyLabel="Choisir un diagnostic"
          newPlaceholder="Nouveau diagnostic..."
          required
        />
      </Field>
      <Field label="Traitement / soins administrés (facultatif)" htmlFor="treatment">
        <Textarea id="treatment" name="treatment" rows={2} placeholder="Notes libres, en complément de l'ordonnance ci-dessous" />
      </Field>

      <div className="space-y-2 rounded-lg border border-zinc-200 p-3">
        <p className="text-sm font-medium text-zinc-700">Ordonnance (facultatif)</p>
        <p className="text-xs text-zinc-500">
          Ajoutez les produits prescrits depuis votre catalogue. Purement informatif : le stock n&apos;est pas
          impacté (le patient achète en pharmacie).
        </p>
        <ProductPicker
          locationId={locationId}
          currency={currency}
          placeholder="Rechercher un médicament/produit à prescrire..."
          onSelect={(p) => addItem({ id: p.id, name: p.name, unit: p.unit })}
        />
        {items.length > 0 && (
          <div className="space-y-2 pt-1">
            {items.map((i) => (
              <div key={i.productId} className="flex flex-wrap items-center gap-2 rounded-lg bg-zinc-50 p-2">
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-900">{i.productName}</span>
                <Input
                  type="number"
                  min={1}
                  step={1}
                  value={i.quantity}
                  onChange={(e) => updateItem(i.productId, { quantity: Number(e.target.value) })}
                  className="w-16"
                  aria-label={`Quantité de ${i.productName}`}
                />
                <span className="text-xs text-zinc-500">{i.unit}</span>
                <Input
                  value={i.posology}
                  onChange={(e) => updateItem(i.productId, { posology: e.target.value })}
                  placeholder="Posologie (ex: 2x/jour, 5 jours)"
                  className="min-w-[180px] flex-1"
                  aria-label={`Posologie de ${i.productName}`}
                />
                <button
                  type="button"
                  onClick={() => removeItem(i.productId)}
                  className="rounded-lg p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600"
                  aria-label={`Retirer ${i.productName}`}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
        <input
          type="hidden"
          name="items"
          value={JSON.stringify(items.map((i) => ({ productId: i.productId, quantity: i.quantity, posology: i.posology })))}
        />
      </div>

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
