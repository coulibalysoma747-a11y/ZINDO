"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/Input";
import { updateOnlineOrderStatusAction } from "@/lib/actions/online-store";
import type { OnlineOrderStatus } from "@/lib/db-types";

const STATUS_OPTIONS: { value: OnlineOrderStatus; label: string }[] = [
  { value: "EN_ATTENTE", label: "À traiter" },
  { value: "CONFIRMEE", label: "Confirmée" },
  { value: "PRETE", label: "Prête" },
  { value: "LIVREE", label: "Encaissée" },
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
