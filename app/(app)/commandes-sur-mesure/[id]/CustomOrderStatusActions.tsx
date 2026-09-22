"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { updateCustomOrderStatusAction } from "@/lib/actions/custom-orders";
import { CUSTOM_ORDER_STATUS_LABELS, CUSTOM_ORDER_STATUS_FLOW } from "@/lib/custom-order-status";
import type { CustomOrderStatus } from "@/lib/db-types";

function nextStatus(status: CustomOrderStatus): CustomOrderStatus | null {
  const index = CUSTOM_ORDER_STATUS_FLOW.indexOf(status);
  if (index === -1 || index === CUSTOM_ORDER_STATUS_FLOW.length - 1) return null;
  return CUSTOM_ORDER_STATUS_FLOW[index + 1];
}

export function CustomOrderStatusActions({ orderId, status }: { orderId: string; status: CustomOrderStatus }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const next = nextStatus(status);

  function apply(newStatus: CustomOrderStatus) {
    startTransition(async () => {
      await updateCustomOrderStatusAction(orderId, newStatus);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-1.5">
      {next && (
        <Button size="sm" disabled={pending} onClick={() => apply(next)}>
          {pending ? "..." : `→ ${CUSTOM_ORDER_STATUS_LABELS[next]}`}
        </Button>
      )}
      <Button
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() => {
          if (!confirm("Annuler cette commande ?")) return;
          apply("ANNULE");
        }}
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
