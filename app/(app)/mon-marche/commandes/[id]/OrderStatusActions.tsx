"use client";

import { useState, useTransition } from "react";
import { updateMarketOrderStatusAction } from "@/lib/actions/market-orders";
import type { MarketOrderStatus } from "@/lib/market";

const NEXT: Record<string, { status: MarketOrderStatus; label: string; hint?: string }> = {
  RECUE: { status: "CONFIRMEE", label: "Confirmer la commande", hint: "Le stock sort maintenant (motif « Commande Marché »)." },
  CONFIRMEE: { status: "PREPARATION", label: "Passer en préparation" },
  PREPARATION: { status: "PRETE", label: "Marquer prête" },
};

export function OrderStatusActions({ orderId, status, deliveryMode }: { orderId: string; status: string; deliveryMode: "LIVRAISON" | "RETRAIT" }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ error?: string; success?: string }>();

  let next = NEXT[status];
  if (status === "PRETE") {
    next =
      deliveryMode === "LIVRAISON"
        ? { status: "EN_LIVRAISON", label: "Partie en livraison" }
        : { status: "LIVREE", label: "Remise au client (livrée)", hint: "L'argent entre en caisse : une session de caisse doit être ouverte." };
  }
  if (status === "EN_LIVRAISON") next = { status: "LIVREE", label: "Livrée", hint: "L'argent entre en caisse : une session de caisse doit être ouverte." };

  function run(target: MarketOrderStatus) {
    let reason: string | undefined;
    if (target === "ANNULEE") {
      const answer = prompt("Motif de l'annulation (le client le verra) :");
      if (answer === null) return;
      reason = answer;
    }
    startTransition(async () => setMessage(await updateMarketOrderStatusAction(orderId, target, reason)));
  }

  return (
    <div className="space-y-2 rounded-2xl bg-white p-5 ring-1 ring-zinc-200">
      {next && (
        <>
          <button
            type="button"
            disabled={pending}
            onClick={() => run(next.status)}
            className="h-12 w-full rounded-xl bg-zindo-green-600 font-semibold text-white hover:bg-zindo-green-700 disabled:opacity-50"
          >
            {pending ? "Enregistrement…" : next.label}
          </button>
          {next.hint && <p className="text-xs text-zinc-500">{next.hint}</p>}
        </>
      )}
      <button type="button" disabled={pending} onClick={() => run("ANNULEE")} className="h-10 w-full rounded-xl border border-red-200 text-sm font-semibold text-red-600 disabled:opacity-50">
        Annuler la commande
      </button>
      {message?.error && <p className="text-sm text-red-600">{message.error}</p>}
      {message?.success && <p className="text-sm text-emerald-700">{message.success}</p>}
    </div>
  );
}
