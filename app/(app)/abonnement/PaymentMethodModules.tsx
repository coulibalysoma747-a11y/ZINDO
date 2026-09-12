"use client";

import { useState } from "react";
import { Check, Copy, Smartphone, Zap } from "lucide-react";

const PAYMENT_NUMBER = "+226 04 05 99 29";
const PAYMENT_NUMBER_RAW = "22604059929";

const METHODS = [
  { key: "orange", label: "Orange Money", className: "bg-[#FF7900] text-white" },
  { key: "moov", label: "Moov Money", className: "bg-[#004990] text-white" },
  { key: "wave", label: "Wave", className: "bg-[#1DC1EE] text-zindo-navy-900" },
];

export function PaymentMethodModules() {
  const [copied, setCopied] = useState(false);

  async function copyNumber() {
    try {
      await navigator.clipboard.writeText(PAYMENT_NUMBER_RAW);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // presse-papiers indisponible — le numéro reste affiché à l'écran
    }
  }

  return (
    <div>
      <p className="mb-2 text-xs font-medium text-zinc-500">Moyens de paiement acceptés</p>
      <div className="grid grid-cols-3 gap-2">
        {METHODS.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={copyNumber}
            className={`flex flex-col items-center gap-1 rounded-lg px-2 py-3 text-xs font-semibold transition hover:opacity-90 ${m.className}`}
          >
            <Smartphone className="h-4 w-4" />
            {m.label}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={copyNumber}
        className="mt-2 flex w-full items-center justify-between rounded-lg border border-dashed border-zinc-300 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-slate-700 dark:hover:bg-slate-800"
      >
        <span>
          Envoyer au <span className="font-mono font-semibold">{PAYMENT_NUMBER}</span>
        </span>
        {copied ? (
          <span className="flex items-center gap-1 text-emerald-600">
            <Check className="h-3.5 w-3.5" /> Copié
          </span>
        ) : (
          <span className="flex items-center gap-1 text-zinc-400">
            <Copy className="h-3.5 w-3.5" /> Copier
          </span>
        )}
      </button>

      <div className="mt-2 flex items-center gap-1.5 text-xs text-zinc-400">
        <Zap className="h-3 w-3" />
        Paiement automatique en un clic bientôt disponible.
      </div>
    </div>
  );
}
