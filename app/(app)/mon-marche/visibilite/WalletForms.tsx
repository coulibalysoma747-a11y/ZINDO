"use client";

import { useActionState, useState, useTransition } from "react";
import { buyBoostAction, submitTopupAction, type WalletState } from "@/lib/actions/market-wallet";

const input = "h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm";

/** Déclaration d'une recharge du portefeuille (transfert Mobile Money déjà fait vers ZINDO). */
export function TopupForm() {
  const [state, action, pending] = useActionState<WalletState, FormData>(submitTopupAction, undefined);
  return (
    <form action={action} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-xs font-medium text-zinc-600">
          Montant envoyé (FCFA)
          <input name="amount" inputMode="numeric" required placeholder="5 000" className={`mt-1 ${input}`} />
        </label>
        <label className="text-xs font-medium text-zinc-600">
          Opérateur
          <select name="operator" required defaultValue="" className={`mt-1 ${input}`}>
            <option value="" disabled>
              Choisir…
            </option>
            <option value="ORANGE">Orange Money</option>
            <option value="MOOV">Moov Money</option>
          </select>
        </label>
        <label className="text-xs font-medium text-zinc-600">
          Référence du transfert
          <input name="reference" required minLength={4} placeholder="PP240923.1234.A12345" className={`mt-1 ${input}`} />
        </label>
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.success && <p className="text-sm text-emerald-700">{state.success}</p>}
      <button disabled={pending} className="h-10 rounded-xl bg-zindo-green-600 px-5 text-sm font-semibold text-white hover:bg-zindo-green-700 disabled:opacity-50">
        {pending ? "Envoi…" : "Déclarer ma recharge"}
      </button>
    </form>
  );
}

/** Achat d'une mise en avant (produit ou boutique), payée depuis le solde. */
export function BoostForm({
  kind,
  targets,
  prices,
  balance,
}: {
  kind: "PRODUIT" | "BOUTIQUE";
  targets: { id: string; label: string }[];
  prices: { days: number; price: number }[];
  balance: number;
}) {
  const [targetId, setTargetId] = useState(targets.length === 1 ? targets[0].id : "");
  const [days, setDays] = useState(prices[0]?.days ?? 0);
  const [message, setMessage] = useState<{ error?: string; success?: string }>();
  const [pending, startTransition] = useTransition();
  const price = prices.find((p) => p.days === days)?.price ?? 0;

  if (targets.length === 0) {
    return <p className="text-sm text-zinc-500">{kind === "PRODUIT" ? "Publiez d'abord un produit sur le Marché." : "Rendez d'abord votre boutique visible."}</p>;
  }

  return (
    <div className="space-y-3">
      {kind === "PRODUIT" && (
        <select value={targetId} onChange={(e) => setTargetId(e.target.value)} className={input} aria-label="Produit à mettre en avant">
          <option value="">Choisir un produit publié…</option>
          {targets.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      )}
      <div className="flex flex-wrap gap-2">
        {prices.map((p) => (
          <button
            key={p.days}
            type="button"
            onClick={() => setDays(p.days)}
            className={
              days === p.days
                ? "rounded-xl border-2 border-zindo-green-600 bg-zindo-green-50 px-3 py-2 text-sm font-semibold text-zindo-green-800"
                : "rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700"
            }
          >
            {p.days} jour{p.days > 1 ? "s" : ""} · {p.price.toLocaleString("fr-FR")} F
          </button>
        ))}
      </div>
      <button
        type="button"
        disabled={pending || !targetId || !days}
        onClick={() => {
          if (!confirm(`Payer ${price.toLocaleString("fr-FR")} FCFA depuis votre portefeuille ?`)) return;
          startTransition(async () => setMessage(await buyBoostAction({ kind, targetId, days })));
        }}
        className="h-10 rounded-xl bg-zinc-900 px-5 text-sm font-semibold text-white disabled:opacity-40"
      >
        {pending ? "Paiement…" : `Mettre en avant · ${price.toLocaleString("fr-FR")} F`}
      </button>
      {price > balance && !message?.success && <p className="text-xs text-amber-700">Solde insuffisant pour cette durée : rechargez votre portefeuille.</p>}
      {message?.error && <p className="text-sm text-red-600">{message.error}</p>}
      {message?.success && <p className="text-sm text-emerald-700">{message.success}</p>}
    </div>
  );
}
