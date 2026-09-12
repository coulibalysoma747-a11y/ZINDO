"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { togglePaymentMethodAction } from "@/lib/actions/settings";
import type { PaymentMethod } from "@prisma/client";

export function PaymentMethodsPanel({
  methods,
}: {
  methods: { method: PaymentMethod; label: string; enabled: boolean }[];
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div className="space-y-2">
      {methods.map((m) => (
        <label
          key={m.method}
          className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-3"
        >
          <span className="text-sm font-medium text-zinc-800">{m.label}</span>
          <input
            type="checkbox"
            defaultChecked={m.enabled}
            disabled={pending}
            onChange={(e) =>
              startTransition(async () => {
                await togglePaymentMethodAction(m.method, e.target.checked);
                router.refresh();
              })
            }
            className="h-5 w-5 rounded accent-zindo-orange-500"
          />
        </label>
      ))}
    </div>
  );
}
