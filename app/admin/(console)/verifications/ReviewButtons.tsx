"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { reviewRenewalAction, reviewVerificationAction } from "@/lib/actions/market-verification";

export function ReviewButtons({ businessId }: { businessId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function decide(approve: boolean) {
    const reason = approve ? undefined : window.prompt("Motif du refus (visible par le commerçant) :") ?? "";
    if (!approve && !reason?.trim()) return;
    start(async () => {
      const res = await reviewVerificationAction(businessId, approve, reason);
      setMessage(res.error ?? res.success ?? null);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => decide(true)}
        className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
      >
        Valider
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => decide(false)}
        className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
      >
        Refuser
      </button>
      {message && <span className="text-xs text-zinc-500">{message}</span>}
    </div>
  );
}

export function RenewalButtons({ businessId }: { businessId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  function decide(approve: boolean) {
    start(async () => {
      const res = await reviewRenewalAction(businessId, approve);
      setMessage(res.error ?? res.success ?? null);
      router.refresh();
    });
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" disabled={pending} onClick={() => decide(true)} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
        Paiement reçu : +30 jours
      </button>
      <button type="button" disabled={pending} onClick={() => decide(false)} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60">
        Paiement introuvable
      </button>
      {message && <span className="text-xs text-zinc-500">{message}</span>}
    </div>
  );
}
