"use client";

import { useState, useTransition } from "react";
import { ShieldCheck } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { setCustomerDebtExemptionAction } from "@/lib/actions/business-settings";

/**
 * Exception au réglage « Refuser la vente si le client a une dette » pour ce
 * client précis (flag exception_dette_client).
 */
export function DebtExemptionToggle({ customerId, initialExempt }: { customerId: string; initialExempt: boolean }) {
  const [exempt, setExempt] = useState(initialExempt);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !exempt;
    setExempt(next);
    setError(null);
    startTransition(async () => {
      const result = await setCustomerDebtExemptionAction(customerId, next);
      if (result.error) {
        setExempt(!next);
        setError(result.error);
      }
    });
  }

  return (
    <Card>
      <CardBody className="flex items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <ShieldCheck className={`mt-0.5 h-5 w-5 shrink-0 ${exempt ? "text-emerald-600" : "text-zinc-400"}`} />
          <div>
            <p className="text-sm font-medium text-zinc-900">Peut acheter même avec une dette</p>
            <p className="text-xs text-zinc-500">
              Exception pour ce client au réglage « Refuser la vente si le client a une dette » (Paramètres).
            </p>
            {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={exempt}
          aria-label="Peut acheter même avec une dette"
          disabled={pending}
          onClick={toggle}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-60 ${
            exempt ? "bg-zindo-green-600" : "bg-zinc-300 dark:bg-slate-700"
          }`}
        >
          <span
            className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
              exempt ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
      </CardBody>
    </Card>
  );
}
