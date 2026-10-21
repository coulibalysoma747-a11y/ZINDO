"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { createSubscriptionInvoiceAction } from "@/lib/actions/subscription";
import type { PlanOffer } from "@/lib/plan-catalog";

export function FormulaChoice({ disabled, plans }: { disabled?: boolean; plans: PlanOffer[] }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const options = plans.filter((plan) => plan.key === "pro").flatMap((plan) => {
    const planKey = "pro" as const;
    const monthly = [{ planKey, cycle: "MONTHLY" as const, title: "Mensuel", period: "sans engagement", price: plan.monthlyPrice, feature: "Toutes les fonctionnalités" }];
    if (plan.annualPrice <= 0) return monthly;
    return [...monthly, {
      planKey,
      cycle: "ANNUAL" as const,
      title: "Annuel",
      period: "2 mois offerts",
      price: plan.annualPrice,
      feature: `Toutes les fonctionnalités · ${Math.max(0, plan.monthlyPrice * 12 - plan.annualPrice).toLocaleString("fr-FR")} FCFA économisés`,
    }];
  });

  function choose(planKey: "pro", cycle: "MONTHLY" | "ANNUAL") {
    setError(null);
    startTransition(async () => {
      const result = await createSubscriptionInvoiceAction(planKey, cycle);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-red-600">{error}</p>}
      {options.map((opt) => (
        <button
          key={`${opt.planKey}:${opt.cycle}`}
          type="button"
          disabled={pending || disabled}
          onClick={() => choose(opt.planKey, opt.cycle)}
          className="flex w-full items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-4 text-left transition hover:border-zindo-blue-400 hover:bg-zindo-blue-50/30 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <div>
            <p className="font-semibold text-zinc-900">{opt.title}</p>
            <p className="text-xs text-zinc-500">{opt.period}</p>
            <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-emerald-600">
              <Check className="h-3.5 w-3.5" /> {opt.feature}
            </p>
          </div>
          <p className="shrink-0 text-lg font-bold text-zindo-blue-600">{opt.price.toLocaleString("fr-FR")} FCFA</p>
        </button>
      ))}
    </div>
  );
}
