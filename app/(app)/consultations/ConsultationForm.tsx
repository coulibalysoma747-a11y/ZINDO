"use client";

import { useActionState, useState } from "react";
import { X, BookmarkPlus } from "lucide-react";
import { createConsultationAction } from "@/lib/actions/consultations";
import type { MedicalAct } from "@/lib/actions/medical-acts";
import type { DiagnosisCategory } from "@/lib/actions/diagnosis-categories";
import { getOrCreateDiagnosisCategoryByNameAction } from "@/lib/actions/diagnosis-categories";
import type { PosologyPreset } from "@/lib/actions/posology-presets";
import { getOrCreatePosologyPresetByNameAction } from "@/lib/actions/posology-presets";
import { EntityQuickSelect } from "@/components/products/EntityQuickSelect";
import { ProductPicker } from "@/components/products/ProductPicker";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

// Une ligne d'ordonnance vient soit du catalogue Produits (productId connu),
// soit d'une description libre tapée par le médecin (ex. "Paracétamol 1000
// mg") pour un médicament hors catalogue — les deux cohabitent, "key" sert
// uniquement de clé React/suppression (un produit catalogue peut être ajouté
// une seule fois, une ligne libre peut être dupliquée).
type PrescriptionItem = { key: string; productId?: string; label: string; unit?: string; quantity: number; posology: string };

export function ConsultationForm({
  medicalActs,
  diagnosisCategories,
  posologyPresets: initialPosologyPresets,
  locationId,
  currency,
}: {
  medicalActs: MedicalAct[];
  diagnosisCategories: DiagnosisCategory[];
  posologyPresets: PosologyPreset[];
  locationId: string;
  currency: string;
}) {
  const [state, action, pending] = useActionState(createConsultationAction, undefined);
  const [fee, setFee] = useState(0);
  const [items, setItems] = useState<PrescriptionItem[]>([]);
  const [customName, setCustomName] = useState("");
  const [posologyPresets, setPosologyPresets] = useState(initialPosologyPresets);
  const [savingPosologyKey, setSavingPosologyKey] = useState<string | null>(null);

  function handleActChange(actId: string) {
    const act = medicalActs.find((a) => a.id === actId);
    if (act) setFee(act.defaultFee);
  }

  function addCatalogItem(product: { id: string; name: string; unit: string }) {
    if (items.some((i) => i.productId === product.id)) return;
    setItems((cur) => [...cur, { key: product.id, productId: product.id, label: product.name, unit: product.unit, quantity: 1, posology: "" }]);
  }

  function addCustomItem() {
    const trimmed = customName.trim();
    if (!trimmed) return;
    setItems((cur) => [...cur, { key: `custom-${Date.now()}`, label: trimmed, quantity: 1, posology: "" }]);
    setCustomName("");
  }

  function updateItem(key: string, patch: Partial<Pick<PrescriptionItem, "quantity" | "posology">>) {
    setItems((cur) => cur.map((i) => (i.key === key ? { ...i, ...patch } : i)));
  }

  function removeItem(key: string) {
    setItems((cur) => cur.filter((i) => i.key !== key));
  }

  async function savePosologyPreset(key: string, label: string) {
    const trimmed = label.trim();
    if (!trimmed || posologyPresets.some((p) => p.label.toLowerCase() === trimmed.toLowerCase())) return;
    setSavingPosologyKey(key);
    const result = await getOrCreatePosologyPresetByNameAction(trimmed);
    setSavingPosologyKey(null);
    if ("id" in result) {
      setPosologyPresets((cur) => [...cur, { id: result.id, label: trimmed }].sort((a, b) => a.label.localeCompare(b.label)));
    }
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

      <div className="space-y-3 rounded-lg border border-zinc-200 p-3">
        <p className="text-sm font-medium text-zinc-700">Ordonnance (facultatif)</p>
        <p className="text-xs text-zinc-500">
          Une ordonnance n&apos;est pas forcément un produit de votre catalogue : décrivez librement un médicament
          (ex. « Paracétamol 1000 mg ») ou choisissez-le dans votre catalogue si vous préférez — au choix. Purement
          informatif : le stock n&apos;est pas impacté (le patient achète en pharmacie).
        </p>

        <div>
          <p className="mb-1 text-xs font-medium text-zinc-500">Décrire un médicament (nom + dosage)</p>
          <div className="flex gap-2">
            <Input
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Ex: Paracétamol 1000 mg"
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustomItem();
                }
              }}
            />
            <Button type="button" variant="outline" onClick={addCustomItem} disabled={!customName.trim()}>
              Ajouter
            </Button>
          </div>
        </div>

        <p className="text-center text-xs text-zinc-400">— ou choisir dans le catalogue —</p>

        <ProductPicker
          locationId={locationId}
          currency={currency}
          placeholder="Rechercher un produit de votre catalogue..."
          onSelect={(p) => addCatalogItem({ id: p.id, name: p.name, unit: p.unit })}
        />

        {items.length > 0 && (
          <div className="space-y-2 pt-1">
            {items.map((i) => (
              <div key={i.key} className="space-y-1.5 rounded-lg bg-zinc-50 p-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-900">{i.label}</span>
                  <Input
                    type="number"
                    min={1}
                    step={1}
                    value={i.quantity}
                    onChange={(e) => updateItem(i.key, { quantity: Number(e.target.value) })}
                    className="w-16"
                    aria-label={`Quantité de ${i.label}`}
                  />
                  {i.unit && <span className="text-xs text-zinc-500">{i.unit}</span>}
                  <button
                    type="button"
                    onClick={() => removeItem(i.key)}
                    className="rounded-lg p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600"
                    aria-label={`Retirer ${i.label}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {posologyPresets.length > 0 && (
                    <Select
                      value=""
                      onChange={(e) => e.target.value && updateItem(i.key, { posology: e.target.value })}
                      className="w-auto min-w-[160px] flex-1"
                      aria-label={`Posologie fréquente pour ${i.label}`}
                    >
                      <option value="">Posologie fréquente...</option>
                      {posologyPresets.map((p) => (
                        <option key={p.id} value={p.label}>
                          {p.label}
                        </option>
                      ))}
                    </Select>
                  )}
                  <Input
                    value={i.posology}
                    onChange={(e) => updateItem(i.key, { posology: e.target.value })}
                    placeholder="Ex: 1 le matin et 1 le soir"
                    className="min-w-[180px] flex-1"
                    aria-label={`Posologie de ${i.label}`}
                  />
                  <button
                    type="button"
                    onClick={() => savePosologyPreset(i.key, i.posology)}
                    disabled={
                      !i.posology.trim() ||
                      savingPosologyKey === i.key ||
                      posologyPresets.some((p) => p.label.toLowerCase() === i.posology.trim().toLowerCase())
                    }
                    className="rounded-lg p-1.5 text-zinc-400 hover:bg-emerald-50 hover:text-emerald-600 disabled:cursor-not-allowed disabled:opacity-30"
                    aria-label={`Enregistrer "${i.posology}" comme posologie fréquente`}
                    title="Enregistrer comme posologie fréquente"
                  >
                    <BookmarkPlus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <input
          type="hidden"
          name="items"
          value={JSON.stringify(
            items.map((i) =>
              i.productId
                ? { productId: i.productId, quantity: i.quantity, posology: i.posology }
                : { customName: i.label, quantity: i.quantity, posology: i.posology }
            )
          )}
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
