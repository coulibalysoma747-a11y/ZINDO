"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { createSubscriptionInvoiceAction } from "@/lib/actions/subscription";

const OPTIONS = [
  { cycle: "MONTHLY" as const, label: "Mensuel", price: 10_000, per: "/mois" },
  { cycle: "ANNUAL" as const, label: "Annuel", price: 100_000, per: "/an", savings: 20_000 },
];

export function CycleChoice() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function choose(cycle: "MONTHLY" | "ANNUAL") {
    setError(null);
    startTransition(async () => {
      const result = await createSubscriptionInvoiceAction(cycle);
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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {OPTIONS.map((opt) => (
          <div key={opt.cycle} className="flex flex-col rounded-xl border border-zinc-200 p-4">
            <p className="text-sm font-medium text-zinc-500">{opt.label}</p>
            <p className="mt-1 text-2xl font-bold text-zinc-900">
              {opt.price.toLocaleString("fr-FR")} <span className="text-sm font-normal text-zinc-400">FCFA{opt.per}</span>
            </p>
            {opt.savings && (
              <p className="mt-1 flex items-center gap-1 text-xs font-medium text-emerald-600">
                <Check className="h-3.5 w-3.5" /> Économisez {opt.savings.toLocaleString("fr-FR")} FCFA / an
              </p>
            )}
            <Button type="button" disabled={pending} onClick={() => choose(opt.cycle)} className="mt-4 w-full">
              Choisir {opt.label.toLowerCase()}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
