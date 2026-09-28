"use client";

import { useState, useTransition } from "react";
import { rejectTopupAction, updateBoostPriceAction, validateTopupAction } from "@/lib/actions/market-admin";

/** Valider ou refuser une recharge de portefeuille (après vérification du transfert reçu). */
export function TopupButtons({ topupId, amount }: { topupId: string; amount: number }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ error?: string; success?: string }>();
  if (message?.success) return <span className="text-xs font-semibold text-emerald-700">{message.success}</span>;
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!confirm(`Avez-vous bien reçu ${amount.toLocaleString("fr-FR")} FCFA ? Le portefeuille sera crédité.`)) return;
          startTransition(async () => setMessage(await validateTopupAction(topupId)));
        }}
        className="rounded-lg bg-zindo-green-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
      >
        Valider
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          const reason = prompt("Motif du refus (le vendeur le verra) :");
          if (reason === null) return;
          startTransition(async () => setMessage(await rejectTopupAction(topupId, reason)));
        }}
        className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 disabled:opacity-50"
      >
        Refuser
      </button>
      {message?.error && <span className="text-xs text-red-600">{message.error}</span>}
    </span>
  );
}

/** Ligne de tarif modifiable (prix et activation d'une durée de mise en avant). */
export function PriceRow({ kind, days, price: initialPrice, active: initialActive }: { kind: "PRODUIT" | "BOUTIQUE"; days: number; price: number; active: boolean }) {
  const [price, setPrice] = useState(String(initialPrice));
  const [active, setActive] = useState(initialActive);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ error?: string; success?: string }>();
  return (
    <tr>
      <td className="px-4 py-2">
        {days} jour{days > 1 ? "s" : ""}
      </td>
      <td className="px-4 py-2">
        <input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="numeric" className="h-9 w-28 rounded-lg border border-zinc-300 px-2 text-sm" aria-label={`Prix ${days} jours`} />{" "}
        FCFA
      </td>
      <td className="px-4 py-2">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4" /> Proposé
        </label>
      </td>
      <td className="px-4 py-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(async () => setMessage(await updateBoostPriceAction(kind, days, Number(price.replace(/\s/g, "")), active)))}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 disabled:opacity-50"
        >
          Enregistrer
        </button>{" "}
        {message?.error && <span className="text-xs text-red-600">{message.error}</span>}
        {message?.success && <span className="text-xs text-emerald-700">{message.success}</span>}
      </td>
    </tr>
  );
}
