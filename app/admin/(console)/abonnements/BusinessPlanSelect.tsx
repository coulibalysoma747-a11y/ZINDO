"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/Input";
import { assignBusinessPlanAction } from "@/lib/actions/subscription-admin";
import type { BillingCycle } from "@/lib/db-types";

export function BusinessPlanSelect({
  businessId,
  planKey,
  billingCycle,
  plans,
}: {
  businessId: string;
  planKey: string | null;
  billingCycle: BillingCycle | null;
  plans: { key: string; label: string }[];
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const value = planKey && billingCycle ? `${planKey}:${billingCycle}` : "";

  return (
    <Select
      value={value}
      disabled={pending}
      className="h-8 max-w-[220px] py-0 text-xs"
      onChange={(e) => {
        const [newPlanKey, newCycle] = e.target.value.split(":");
        startTransition(async () => {
          await assignBusinessPlanAction(businessId, newPlanKey, newCycle as BillingCycle);
          router.refresh();
        });
      }}
    >
      {!value && (
        <option value="" disabled>
          Aucun palier (illimité) — choisir...
        </option>
      )}
      {value && !plans.some((p) => p.key === planKey) && (
        <option value={value} disabled>
          Ancien palier — passer au Pro...
        </option>
      )}
      {plans.map((p) => (
        <optgroup key={p.key} label={p.label}>
          <option value={`${p.key}:MONTHLY`}>{p.label} — Mensuel</option>
          <option value={`${p.key}:ANNUAL`}>{p.label} — Annuel</option>
        </optgroup>
      ))}
    </Select>
  );
}
