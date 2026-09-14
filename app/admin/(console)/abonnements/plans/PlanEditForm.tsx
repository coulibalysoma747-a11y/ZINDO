"use client";

import { useActionState, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Field, Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { updateSubscriptionPlanAction, type ActionState } from "@/lib/actions/subscription-admin";

type Plan = {
  id: string;
  key: string;
  label: string;
  monthlyPrice: number;
  annualPrice: number;
  maxProducts: number | null;
  maxUsers: number | null;
  maxLocations: number | null;
  features: string[];
};

export function PlanEditForm({
  plan,
  featureCatalog,
}: {
  plan: Plan;
  featureCatalog: { key: string; label: string; enforced: boolean }[];
}) {
  const boundAction = updateSubscriptionPlanAction.bind(null, plan.id);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(boundAction, undefined);
  const [open, setOpen] = useState(false);
  const [features, setFeatures] = useState<string[]>(plan.features);

  function toggleFeature(key: string) {
    setFeatures((prev) => (prev.includes(key) ? prev.filter((f) => f !== key) : [...prev, key]));
  }

  return (
    <Card>
      <CardHeader className="cursor-pointer" onClick={() => setOpen((o) => !o)}>
        <div>
          <h2 className="font-semibold text-zinc-900">{plan.label}</h2>
          <p className="text-xs text-zinc-500">
            {plan.monthlyPrice.toLocaleString("fr-FR")} FCFA/mois · {plan.annualPrice.toLocaleString("fr-FR")} FCFA/an
          </p>
        </div>
        <ChevronDown className={`h-4 w-4 text-zinc-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </CardHeader>
      {open && (
        <CardBody>
          <form action={formAction} className="space-y-4">
            {features.map((f) => (
              <input key={f} type="hidden" name="features" value={f} />
            ))}

            <Field label="Nom du palier" htmlFor={`label-${plan.id}`}>
              <Input id={`label-${plan.id}`} name="label" defaultValue={plan.label} required />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Prix mensuel (FCFA)" htmlFor={`monthly-${plan.id}`}>
                <Input id={`monthly-${plan.id}`} name="monthlyPrice" type="number" min={0} defaultValue={plan.monthlyPrice} required />
              </Field>
              <Field label="Prix annuel (FCFA)" htmlFor={`annual-${plan.id}`}>
                <Input id={`annual-${plan.id}`} name="annualPrice" type="number" min={0} defaultValue={plan.annualPrice} required />
              </Field>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <Field label="Max produits" htmlFor={`products-${plan.id}`} hint="Vide = illimité">
                <Input id={`products-${plan.id}`} name="maxProducts" type="number" min={0} defaultValue={plan.maxProducts ?? ""} />
              </Field>
              <Field label="Max utilisateurs" htmlFor={`users-${plan.id}`} hint="Vide = illimité">
                <Input id={`users-${plan.id}`} name="maxUsers" type="number" min={0} defaultValue={plan.maxUsers ?? ""} />
              </Field>
              <Field label="Max boutiques" htmlFor={`locations-${plan.id}`} hint="Vide = illimité">
                <Input id={`locations-${plan.id}`} name="maxLocations" type="number" min={0} defaultValue={plan.maxLocations ?? ""} />
              </Field>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-zinc-700">Fonctionnalités incluses</p>
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {featureCatalog.map((f) => (
                  <label key={f.key} className="flex items-center gap-2 text-sm text-zinc-700">
                    <input
                      type="checkbox"
                      checked={features.includes(f.key)}
                      onChange={() => toggleFeature(f.key)}
                      className="h-4 w-4 rounded accent-zindo-green-500"
                    />
                    {f.label}
                    {f.enforced && (
                      <span className="rounded-full bg-zindo-green-50 px-1.5 py-0.5 text-[10px] font-medium text-zindo-green-700">
                        appliquée
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </div>

            {state?.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
            {state?.success && (
              <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{state.success}</p>
            )}

            <div className="flex justify-end">
              <Button type="submit" disabled={pending}>
                {pending ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </div>
          </form>
        </CardBody>
      )}
    </Card>
  );
}
