"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { formatMoney } from "@/lib/format";

const METHOD_LABELS: Record<string, string> = {
  ESPECES: "Espèces",
  MOBILE_MONEY: "Mobile Money",
  CARTE: "Carte bancaire",
  CREDIT: "Crédit",
  AUTRE: "Autre",
};
const METHOD_COLORS: Record<string, string> = {
  ESPECES: "bg-emerald-500",
  MOBILE_MONEY: "bg-violet-400",
  CARTE: "bg-blue-400",
  CREDIT: "bg-amber-400",
  AUTRE: "bg-zinc-400",
};

export function PaymentBreakdownDetail({
  cashedIn,
  byMethod,
  currency,
}: {
  cashedIn: number;
  byMethod: Record<string, { amount: number; count: number }>;
  currency: string;
}) {
  const [open, setOpen] = useState(false);
  const methods = Object.entries(byMethod).filter(([, v]) => v.amount > 0);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 text-left text-sm font-medium text-zinc-700 hover:text-zindo-green-600"
      >
        <span>Voir le détail par moyen de paiement</span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {open && (
        <div className="mt-3">
          <div className="flex h-2 overflow-hidden rounded-full bg-zinc-100">
            {methods.map(([method, v]) => (
              <div
                key={method}
                className={METHOD_COLORS[method] ?? "bg-zinc-400"}
                style={{ width: `${(v.amount / cashedIn) * 100}%` }}
              />
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-4 text-sm">
            {methods.map(([method, v]) => (
              <span key={method} className="flex items-center gap-1.5 text-zinc-600">
                <span className={`h-2 w-2 rounded-full ${METHOD_COLORS[method] ?? "bg-zinc-400"}`} />
                {METHOD_LABELS[method] ?? method} —{" "}
                <span className="font-medium text-zinc-900">{formatMoney(v.amount, currency)}</span>
                <span className="text-zinc-400">({v.count} règlement{v.count > 1 ? "s" : ""})</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
