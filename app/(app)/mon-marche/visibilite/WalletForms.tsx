"use client";

import { useState, useTransition } from "react";
import { buyBoostAction } from "@/lib/actions/market-wallet";
import { topupWithSaspayAction } from "@/lib/actions/saspay";

const input = "h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm";

/** Recharge du portefeuille en ligne par SasPay : crédit automatique à la confirmation. */
export function SaspayTopupForm() {
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          setError(null);
          const result = await topupWithSaspayAction(Number(amount.replace(/\s/g, "")));
          if (result.error || !result.url) {
            setError(result.error ?? "Paiement indisponible");
            return;
          }
          window.location.href = result.url;
        });
      }}
    >
      <p className="text-sm text-zinc-600">Payez en ligne avec SasPay. Votre solde est crédité tout seul dès que le paiement est confirmé.</p>
      <label className="block text-xs font-medium text-zinc-600">
        Montant à recharger (FCFA)
        <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="numeric" required placeholder="5 000" className={`mt-1 max-w-xs ${input}`} />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button disabled={pending || !amount.trim()} className="h-10 rounded-xl bg-zindo-green-600 px-5 text-sm font-semibold text-white hover:bg-zindo-green-700 disabled:opacity-50">
        {pending ? "Redirection…" : "Payer avec SasPay"}
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
