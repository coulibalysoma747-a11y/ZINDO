"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { updateTrialDaysAction, type ActionState } from "@/lib/actions/subscription-admin";

export function TrialDaysForm({ trialDays, maxDays }: { trialDays: number; maxDays: number }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(updateTrialDaysAction, undefined);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <div>
        <label htmlFor="trialDays" className="mb-1 block text-sm font-medium text-zinc-700">
          Durée de l&apos;essai gratuit (jours)
        </label>
        <Input
          id="trialDays"
          name="trialDays"
          type="number"
          min={1}
          max={maxDays}
          step={1}
          required
          defaultValue={trialDays}
          className="w-28"
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Enregistrement..." : "Enregistrer"}
      </Button>
      <p className="w-full text-xs text-zinc-500">
        S&apos;applique aux commerces qui s&apos;inscrivent à partir de maintenant. Les essais en cours ne changent
        pas (utilisez « +7 jours d&apos;essai » sur un commerce précis).
      </p>
      {state?.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
      {state?.success && <p className="w-full text-sm text-emerald-600">{state.success}</p>}
    </form>
  );
}
