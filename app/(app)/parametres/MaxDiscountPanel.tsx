"use client";

import { useState, useTransition } from "react";
import { Percent } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { updateBusinessSettingsAction } from "@/lib/actions/business-settings";

/** Remise maximum des vendeurs (flag max_discount_non_admin) — l'administrateur n'est jamais limité. */
export function MaxDiscountPanel({ initialPercent }: { initialPercent: number }) {
  const [value, setValue] = useState(String(initialPercent));
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  function save() {
    setMessage(null);
    const percent = Number(value.replace(",", "."));
    startTransition(async () => {
      const result = await updateBusinessSettingsAction({ maxDiscountPercent: percent });
      setMessage(result.error ? { ok: false, text: result.error } : { ok: true, text: "Remise maximum enregistrée" });
    });
  }

  return (
    <div className="rounded-xl border border-zinc-200 p-4">
      <div className="flex items-start gap-2.5">
        <Percent className="mt-0.5 h-5 w-5 shrink-0 text-zindo-green-600" />
        <div>
          <p className="font-bold text-zinc-900">Remise maximum des vendeurs</p>
          <p className="mt-1 text-sm text-zinc-500">
            Au-delà de ce pourcentage (remises des lignes et du panier additionnées), la vente est refusée et le
            vendeur doit demander à un administrateur. L&apos;administrateur n&apos;est pas limité.
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <div className="relative w-28">
          <Input
            type="number"
            min={0}
            max={100}
            step="0.5"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            aria-label="Remise maximum en pourcentage"
            className="pr-8"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">%</span>
        </div>
        <Button type="button" size="sm" disabled={pending} onClick={save}>
          {pending ? "Enregistrement..." : "Enregistrer"}
        </Button>
        {message && <p className={`text-sm ${message.ok ? "text-emerald-600" : "text-red-600"}`}>{message.text}</p>}
      </div>
    </div>
  );
}
