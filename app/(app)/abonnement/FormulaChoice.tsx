"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { createSubscriptionInvoiceAction } from "@/lib/actions/subscription";

export const MONTHLY_PRICE = 7_500;
export const ANNUAL_PRICE = 75_000;

const OPTIONS = [
  { planKey: "starter" as const, cycle: "MONTHLY" as const, title: "Starter", period: "par mois", price: 5_000, feature: "500 produits · 3 utilisateurs · 1 boutique" },
  { planKey: "pro" as const, cycle: "MONTHLY" as const, title: "Entreprise", period: "par mois", price: MONTHLY_PRICE, feature: "Tous les modules · 10 utilisateurs · 5 boutiques" },
  { planKey: "pro" as const, cycle: "ANNUAL" as const, title: "Entreprise annuel", period: "par an · soit 6 250 FCFA/mois", price: ANNUAL_PRICE, feature: "Économisez 15 000 FCFA" },
];

export function FormulaChoice({ disabled }: { disabled?: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function choose(planKey: "starter" | "pro", cycle: "MONTHLY" | "ANNUAL") {
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
      {OPTIONS.map((opt) => (
        <button
          key={`${opt.planKey}:${opt.cycle}`}
          type="button"
          disabled={pending || disabled}
          onClick={() => choose(opt.planKey, opt.cycle)}
          className="flex w-full items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-4 text-left transition hover:border-zindo-green-400 hover:bg-zindo-green-50/30 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <div>
            <p className="font-semibold text-zinc-900">{opt.title}</p>
            <p className="text-xs text-zinc-500">{opt.period}</p>
            <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-emerald-600">
              <Check className="h-3.5 w-3.5" /> {opt.feature}
            </p>
          </div>
          <p className="shrink-0 text-lg font-bold text-zindo-green-600">{opt.price.toLocaleString("fr-FR")} FCFA</p>
        </button>
      ))}
    </div>
  );
}
