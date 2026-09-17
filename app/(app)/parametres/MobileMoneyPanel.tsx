"use client";

import { useState, useTransition } from "react";
import { Smartphone } from "lucide-react";
import { updateBusinessSettingsAction } from "@/lib/actions/business-settings";
import type { BusinessSettings } from "@/lib/business-settings";

const OPERATORS: { key: "ORANGE" | "MOOV" | "WAVE"; label: string }[] = [
  { key: "ORANGE", label: "Orange Money" },
  { key: "MOOV", label: "Moov Money" },
  { key: "WAVE", label: "Wave" },
];

export function MobileMoneyPanel({ settings }: { settings: BusinessSettings }) {
  const [operators, setOperators] = useState(settings.mobileMoneyOperators);
  const [allowMixed, setAllowMixed] = useState(settings.allowMixedPayment);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function save(patch: Partial<Pick<BusinessSettings, "mobileMoneyOperators" | "allowMixedPayment">>) {
    setError(null);
    startTransition(async () => {
      const result = await updateBusinessSettingsAction(patch);
      if (result.error) setError(result.error);
    });
  }

  function toggleOperator(key: "ORANGE" | "MOOV" | "WAVE") {
    const next = operators.includes(key) ? operators.filter((o) => o !== key) : [...operators, key];
    if (next.length === 0) return; // au moins un opérateur doit rester coché
    setOperators(next);
    save({ mobileMoneyOperators: next });
  }

  return (
    <div className="rounded-xl border border-zinc-200 p-4">
      <div className="flex items-start gap-2.5">
        <Smartphone className="mt-0.5 h-5 w-5 shrink-0 text-zindo-green-600" />
        <div>
          <p className="font-bold text-zinc-900">Personnaliser l&apos;encaissement</p>
          <p className="mt-1 text-sm text-zinc-500">
            Décochez les opérateurs mobile money que vous n&apos;encaissez pas. Un seul coché, et il est choisi
            automatiquement à la vente — plus rien à cliquer.
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {OPERATORS.map((op) => (
          <label
            key={op.key}
            className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${
              operators.includes(op.key) ? "border-zindo-green-400 bg-zindo-green-50 text-zindo-green-700" : "border-zinc-200 text-zinc-500"
            }`}
          >
            <input
              type="checkbox"
              checked={operators.includes(op.key)}
              disabled={pending}
              onChange={() => toggleOperator(op.key)}
              className="h-3.5 w-3.5 accent-zindo-green-500"
            />
            {op.label}
          </label>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-zinc-100 p-3">
        <div>
          <p className="text-sm font-medium text-zinc-900">Autoriser le paiement mixte (espèces + mobile money)</p>
          <p className="text-xs text-zinc-500">Le moyen de paiement « Mixte » permet de répartir le total entre les deux.</p>
        </div>
        <input
          type="checkbox"
          checked={allowMixed}
          disabled={pending}
          onChange={(e) => {
            const v = e.target.checked;
            setAllowMixed(v);
            save({ allowMixedPayment: v });
          }}
          className="h-5 w-5 shrink-0 rounded accent-zindo-green-500"
        />
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
