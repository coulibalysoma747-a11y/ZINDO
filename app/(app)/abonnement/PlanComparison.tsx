"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { requestPlanChangeAction } from "@/lib/actions/subscription";
import { FEATURE_CATALOG } from "@/lib/subscription-features";

const FEATURE_LABELS: Record<string, string> = Object.fromEntries(FEATURE_CATALOG.map((f) => [f.key, f.label]));

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

function formatFcfa(n: number) {
  return n === 0 ? "Gratuit" : `${n.toLocaleString("fr-FR")} FCFA`;
}

export function PlanComparison({
  plans,
  currentPlanKey,
  hasPendingInvoice,
}: {
  plans: Plan[];
  currentPlanKey: string | null;
  currency: string;
  hasPendingInvoice: boolean;
}) {
  const [cycle, setCycle] = useState<"MONTHLY" | "ANNUAL">("MONTHLY");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function choosePlan(planKey: string) {
    setError(null);
    startTransition(async () => {
      const result = await requestPlanChangeAction(planKey, cycle);
      if (!result.success) {
        setError(result.error);
        return;
      }
      if (result.paymentUrl) {
        window.location.href = result.paymentUrl;
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        <div className="inline-flex rounded-lg border border-zinc-200 p-1 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setCycle("MONTHLY")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium ${cycle === "MONTHLY" ? "bg-zinc-900 text-white" : "text-zinc-600"}`}
          >
            Mensuel
          </button>
          <button
            type="button"
            onClick={() => setCycle("ANNUAL")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium ${cycle === "ANNUAL" ? "bg-zinc-900 text-white" : "text-zinc-600"}`}
          >
            Annuel
          </button>
        </div>
      </div>

      {error && <p className="text-center text-sm text-red-600">{error}</p>}
      {hasPendingInvoice && (
        <p className="text-center text-xs text-amber-600">
          Vous avez déjà une facture en attente — réglez-la ou attendez son annulation avant d&apos;en générer une
          nouvelle.
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan, index) => {
          const price = cycle === "ANNUAL" ? plan.annualPrice : plan.monthlyPrice;
          const isCurrent = plan.key === currentPlanKey;
          const previousPlan = index > 0 ? plans[index - 1] : null;
          const newFeatureKeys = previousPlan
            ? plan.features.filter((f) => !previousPlan.features.includes(f))
            : plan.features;
          return (
            <div
              key={plan.id}
              className={`flex flex-col rounded-xl border p-4 ${isCurrent ? "border-emerald-400 bg-emerald-50/50 dark:bg-emerald-500/5" : "border-zinc-200 dark:border-slate-700"}`}
            >
              <p className="font-semibold text-zinc-900">{plan.label}</p>
              <p className="mt-1 text-lg font-bold text-zinc-900">
                {formatFcfa(price)}
                {price > 0 && <span className="text-xs font-normal text-zinc-400">/{cycle === "ANNUAL" ? "an" : "mois"}</span>}
              </p>
              <ul className="mt-3 space-y-1 text-xs text-zinc-500">
                <li>{plan.maxProducts ? `${plan.maxProducts} produits` : "Produits illimités"}</li>
                <li>{plan.maxUsers ? `${plan.maxUsers} utilisateur(s)` : "Utilisateurs illimités"}</li>
                <li>{plan.maxLocations ? `${plan.maxLocations} boutique(s)` : "Boutiques illimitées"}</li>
              </ul>
              <div className="mt-3 flex-1 border-t border-zinc-100 pt-3 dark:border-slate-800">
                {previousPlan && (
                  <p className="mb-1.5 text-xs font-medium text-zinc-600">Tout {previousPlan.label}, plus :</p>
                )}
                <ul className="space-y-1">
                  {newFeatureKeys.map((key) => (
                    <li key={key} className="flex items-start gap-1.5 text-xs text-zinc-600">
                      <Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" />
                      {FEATURE_LABELS[key] ?? key}
                    </li>
                  ))}
                </ul>
              </div>
              <Button
                type="button"
                variant={isCurrent ? "outline" : "primary"}
                size="sm"
                disabled={isCurrent || pending || hasPendingInvoice}
                onClick={() => choosePlan(plan.key)}
                className="mt-4 w-full"
              >
                {isCurrent ? (
                  <>
                    <Check className="h-3.5 w-3.5" /> Palier actuel
                  </>
                ) : (
                  "Choisir"
                )}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
