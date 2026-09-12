"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Field, Input, Textarea, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { saveActivityConfigAction, type ActionState } from "@/lib/actions/activity-config";
import { TERM_DEFAULTS, type TermKey, type CustomFieldDef, type CustomFieldType } from "@/lib/activity-terms";

const TERM_ORDER: TermKey[] = ["products", "clients", "suppliers", "sales", "purchases", "stock", "credits"];

const FIELD_TYPE_LABELS: Record<CustomFieldType, string> = {
  text: "Texte",
  number: "Nombre",
  date: "Date",
};

function slugify(label: string) {
  return label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function ActivityConfigForm({
  activityKey,
  hideableNavItems,
  initial,
}: {
  activityKey: string;
  hideableNavItems: { href: string; label: string }[];
  initial: {
    terminology: Partial<Record<TermKey, string>>;
    hiddenNavHrefs: string[];
    defaultCategories: string[];
    customFields: CustomFieldDef[];
  };
}) {
  const router = useRouter();
  const boundAction = saveActivityConfigAction.bind(null, activityKey);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(boundAction, undefined);

  const [hiddenHrefs, setHiddenHrefs] = useState<string[]>(initial.hiddenNavHrefs);
  const [customFields, setCustomFields] = useState<CustomFieldDef[]>(initial.customFields);
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldType, setNewFieldType] = useState<CustomFieldType>("text");

  function toggleHref(href: string) {
    setHiddenHrefs((prev) => (prev.includes(href) ? prev.filter((h) => h !== href) : [...prev, href]));
  }

  function addCustomField() {
    const label = newFieldLabel.trim();
    if (!label) return;
    const key = slugify(label);
    if (!key || customFields.some((f) => f.key === key)) return;
    setCustomFields((prev) => [...prev, { key, label, type: newFieldType }]);
    setNewFieldLabel("");
    setNewFieldType("text");
  }

  function removeCustomField(key: string) {
    setCustomFields((prev) => prev.filter((f) => f.key !== key));
  }

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="customFieldsJson" value={JSON.stringify(customFields)} />

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-zinc-900">Vocabulaire de l&apos;interface</h2>
          <p className="text-xs text-zinc-500">
            Laissez vide pour garder le mot par défaut. Ces mots remplacent le libellé dans le menu et les
            titres de page correspondants.
          </p>
        </CardHeader>
        <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {TERM_ORDER.map((term) => (
            <Field key={term} label={TERM_DEFAULTS[term]} htmlFor={`term_${term}`}>
              <Input
                id={`term_${term}`}
                name={`term_${term}`}
                defaultValue={initial.terminology[term] ?? ""}
                placeholder={TERM_DEFAULTS[term]}
              />
            </Field>
          ))}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-zinc-900">Catégories créées automatiquement</h2>
          <p className="text-xs text-zinc-500">
            Une par ligne. Créées dans le commerce dès que cette activité est choisie (les catégories déjà
            existantes ne sont jamais supprimées ni dupliquées).
          </p>
        </CardHeader>
        <CardBody>
          <Textarea
            name="defaultCategories"
            rows={5}
            defaultValue={initial.defaultCategories.join("\n")}
            placeholder={"Médicaments\nParapharmacie\nHygiène"}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-zinc-900">Modules masqués dans le menu</h2>
          <p className="text-xs text-zinc-500">
            Cochez les modules à cacher pour cette activité (ex : masquer « Crédits » pour un restaurant).
          </p>
        </CardHeader>
        <CardBody className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {hideableNavItems.map((item) => (
            <label key={item.href} className="flex items-center gap-2 text-sm text-zinc-700">
              <input
                type="checkbox"
                name="hiddenNavHrefs"
                value={item.href}
                checked={hiddenHrefs.includes(item.href)}
                onChange={() => toggleHref(item.href)}
                className="h-4 w-4 rounded accent-zindo-orange-500"
              />
              {item.label}
            </label>
          ))}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-zinc-900">Champs produit spécifiques</h2>
          <p className="text-xs text-zinc-500">
            Champs supplémentaires proposés à la création/modification d&apos;un produit pour cette activité
            (ex : « Date de péremption » pour une pharmacie).
          </p>
        </CardHeader>
        <CardBody className="space-y-3">
          {customFields.length > 0 && (
            <div className="space-y-2">
              {customFields.map((f) => (
                <div key={f.key} className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 text-sm">
                  <span className="text-zinc-700">
                    {f.label} <span className="text-zinc-400">({FIELD_TYPE_LABELS[f.type]})</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => removeCustomField(f.key)}
                    className="text-zinc-400 hover:text-red-500"
                    aria-label="Supprimer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[160px] flex-1">
              <label className="mb-1 block text-xs font-medium text-zinc-600">Nom du champ</label>
              <Input
                value={newFieldLabel}
                onChange={(e) => setNewFieldLabel(e.target.value)}
                placeholder="Ex : Date de péremption"
              />
            </div>
            <div className="w-32">
              <label className="mb-1 block text-xs font-medium text-zinc-600">Type</label>
              <Select value={newFieldType} onChange={(e) => setNewFieldType(e.target.value as CustomFieldType)}>
                <option value="text">Texte</option>
                <option value="number">Nombre</option>
                <option value="date">Date</option>
              </Select>
            </div>
            <Button type="button" variant="outline" onClick={addCustomField}>
              <Plus className="h-4 w-4" /> Ajouter
            </Button>
          </div>
        </CardBody>
      </Card>

      {state?.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
      {state?.success && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{state.success}</p>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.push("/admin/activites")}>
          Retour
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Enregistrement..." : "Enregistrer la configuration"}
        </Button>
      </div>
    </form>
  );
}
