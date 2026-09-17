"use client";

import { useState, useTransition } from "react";
import { UserCheck } from "lucide-react";
import { updateBusinessSettingsAction } from "@/lib/actions/business-settings";
import type { BusinessSettings } from "@/lib/business-settings";

function Toggle({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <input
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={(e) => onChange(e.target.checked)}
      className="h-5 w-5 shrink-0 rounded accent-zindo-green-500"
    />
  );
}

export function BusinessRulesPanel({ settings }: { settings: BusinessSettings }) {
  const [requireCustomerOnSale, setRequireCustomerOnSale] = useState(settings.requireCustomerOnSale);
  const [blockSaleIfCustomerDebt, setBlockSaleIfCustomerDebt] = useState(settings.blockSaleIfCustomerDebt);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function save(patch: Partial<BusinessSettings>) {
    setError(null);
    startTransition(async () => {
      const result = await updateBusinessSettingsAction(patch);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="rounded-xl border border-zinc-200 p-4">
      <div className="flex items-start gap-2.5">
        <UserCheck className="mt-0.5 h-5 w-5 shrink-0 text-zindo-green-600" />
        <div>
          <p className="font-bold text-zinc-900">Vente au nom d&apos;un client</p>
          <p className="mt-1 text-sm text-zinc-500">
            Deux règles pour savoir qui achète, et pour ne plus laisser une ardoise grossir. Les deux sont
            désactivées par défaut : tant qu&apos;elles le restent, la caisse est exactement celle d&apos;aujourd&apos;hui.
          </p>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-100 p-3">
          <div>
            <p className="text-sm font-medium text-zinc-900">Toute vente au nom d&apos;un client</p>
            <p className="text-xs text-zinc-500">Désactivé : le client reste facultatif (sauf à crédit, où il l&apos;a toujours été).</p>
          </div>
          <Toggle
            checked={requireCustomerOnSale}
            disabled={pending}
            onChange={(v) => {
              setRequireCustomerOnSale(v);
              save({ requireCustomerOnSale: v });
            }}
          />
        </div>
        <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-100 p-3">
          <div>
            <p className="text-sm font-medium text-zinc-900">Refuser la vente si le client a une dette</p>
            <p className="text-xs text-zinc-500">Au moment d&apos;encaisser, la caisse annonce la somme due et refuse la vente tant qu&apos;elle n&apos;est pas réglée.</p>
          </div>
          <Toggle
            checked={blockSaleIfCustomerDebt}
            disabled={pending}
            onChange={(v) => {
              setBlockSaleIfCustomerDebt(v);
              save({ blockSaleIfCustomerDebt: v });
            }}
          />
        </div>
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
