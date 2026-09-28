"use client";

import { useState, useTransition } from "react";
import { closeReportAction, setBuyerBlockedAction, setListingRemovedAction, setReviewHiddenAction, setShopSuspendedAction } from "@/lib/actions/market-admin";

type Kind =
  | { kind: "shop"; id: string; suspended: boolean }
  | { kind: "listing"; id: string; removed: boolean }
  | { kind: "report"; id: string; status: "TRAITE" | "REJETE" }
  | { kind: "review"; id: string; hidden: boolean }
  | { kind: "buyer"; id: string; blocked: boolean };

/** Bouton d'action de la console Marché ; demande le motif quand il est obligatoire. */
export function AdminMarketButton({ label, danger = false, ...target }: Kind & { label: string; danger?: boolean }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ error?: string; success?: string }>();

  function run() {
    let reason: string | undefined;
    const needsReason = (target.kind === "shop" && target.suspended) || (target.kind === "listing" && target.removed);
    if (needsReason) {
      const answer = prompt("Motif (le vendeur le verra) :");
      if (answer === null) return;
      reason = answer;
    } else if (danger && !confirm(`${label} ?`)) {
      return;
    }
    startTransition(async () => {
      const result =
        target.kind === "shop"
          ? await setShopSuspendedAction(target.id, target.suspended, reason)
          : target.kind === "listing"
            ? await setListingRemovedAction(target.id, target.removed, reason)
            : target.kind === "report"
              ? await closeReportAction(target.id, target.status)
              : target.kind === "review"
                ? await setReviewHiddenAction(target.id, target.hidden)
                : await setBuyerBlockedAction(target.id, target.blocked);
      setMessage(result);
    });
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={run}
        className={
          danger
            ? "rounded-lg border border-red-200 bg-white px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
            : "rounded-lg border border-zinc-300 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
        }
      >
        {label}
      </button>
      {message?.error && <span className="text-xs text-red-600">{message.error}</span>}
      {message?.success && <span className="text-xs text-emerald-700">{message.success}</span>}
    </span>
  );
}
