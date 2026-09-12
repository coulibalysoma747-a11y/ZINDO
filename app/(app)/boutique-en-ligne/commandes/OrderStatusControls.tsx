"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/Input";
import { updateOnlineOrderStatusAction } from "@/lib/actions/online-store";
import type { OnlineOrderStatus } from "@prisma/client";

const STATUS_OPTIONS: { value: OnlineOrderStatus; label: string }[] = [
  { value: "EN_ATTENTE", label: "En attente" },
  { value: "CONFIRMEE", label: "Confirmée" },
  { value: "LIVREE", label: "Livrée" },
  { value: "ANNULEE", label: "Annulée" },
];

export function OrderStatusControls({ orderId, status }: { orderId: string; status: OnlineOrderStatus }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Select
      value={status}
      disabled={pending}
      className="h-8 w-auto py-0 text-xs"
      onChange={(e) =>
        startTransition(async () => {
          await updateOnlineOrderStatusAction(orderId, e.target.value as OnlineOrderStatus);
          router.refresh();
        })
      }
    >
      {STATUS_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </Select>
  );
}
