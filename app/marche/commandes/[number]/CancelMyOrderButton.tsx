"use client";

import { useState, useTransition } from "react";
import { cancelMyMarketOrderAction } from "@/lib/actions/market-orders";

export function CancelMyOrderButton({ orderId }: { orderId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  return (
    <div className="flex-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!confirm("Annuler cette commande ?")) return;
          startTransition(async () => setError((await cancelMyMarketOrderAction(orderId)).error));
        }}
        className="w-full rounded-xl border border-red-200 bg-white py-2.5 text-sm font-semibold text-red-600 disabled:opacity-50"
      >
        Annuler la commande
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
