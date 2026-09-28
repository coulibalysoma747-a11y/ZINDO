"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Flag } from "lucide-react";
import { reportMarketAction } from "@/lib/actions/market-social";
import { MARKET_REPORT_REASONS } from "@/lib/market";

type Reason = (typeof MARKET_REPORT_REASONS)[number]["key"];

/** « Signaler » un produit (listingId) ou une boutique (shopId). */
export function ReportButton({ listingId, shopId, label = "Signaler" }: { listingId?: string; shopId?: string; label?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<Reason | "">("");
  const [details, setDetails] = useState("");
  const [message, setMessage] = useState<{ error?: string; success?: string }>();
  const [pending, startTransition] = useTransition();

  function send() {
    if (!reason) return setMessage({ error: "Choisissez un motif." });
    startTransition(async () => {
      const result = await reportMarketAction({ listingId, shopId, reason, details: details || undefined });
      if (result.needsLogin) return router.push(`/marche/compte?suite=${encodeURIComponent(pathname)}`);
      setMessage(result);
    });
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-red-600">
        <Flag className="h-3.5 w-3.5" /> {label}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={() => setOpen(false)}>
          <div role="dialog" aria-modal="true" aria-label={label} className="w-full max-w-md space-y-3 rounded-2xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
            <p className="font-bold text-zinc-900">{label}</p>
            {message?.success ? (
              <p className="text-sm text-emerald-700">{message.success}</p>
            ) : (
              <>
                <div className="grid gap-2">
                  {MARKET_REPORT_REASONS.map((r) => (
                    <label key={r.key} className="flex items-center gap-2 text-sm text-zinc-700">
                      <input type="radio" name="reason" checked={reason === r.key} onChange={() => setReason(r.key)} className="h-4 w-4" />
                      {r.label}
                    </label>
                  ))}
                </div>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  rows={3}
                  placeholder="Précisez (facultatif)"
                  className="w-full rounded-lg border border-zinc-300 p-2 text-sm"
                />
                {message?.error && <p className="text-sm text-red-600">{message.error}</p>}
              </>
            )}
            <div className="flex gap-2">
              {!message?.success && (
                <button type="button" disabled={pending} onClick={send} className="h-10 flex-1 rounded-xl bg-red-600 text-sm font-semibold text-white disabled:opacity-50">
                  Envoyer le signalement
                </button>
              )}
              <button type="button" onClick={() => setOpen(false)} className="h-10 flex-1 rounded-xl border border-zinc-300 text-sm font-semibold text-zinc-700">
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
