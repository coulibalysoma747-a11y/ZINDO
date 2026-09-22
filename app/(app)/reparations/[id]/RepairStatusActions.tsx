"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { updateRepairStatusAction, REPAIR_STATUS_LABELS, REPAIR_STATUS_FLOW } from "@/lib/actions/repairs";
import type { RepairStatus } from "@/lib/db-types";

/** Prochaine étape normale du parcours d'un bon — le commerçant peut aussi sauter des étapes si besoin (ex. RECU → TERMINE). */
function nextStatus(status: RepairStatus): RepairStatus | null {
  const index = REPAIR_STATUS_FLOW.indexOf(status);
  if (index === -1 || index === REPAIR_STATUS_FLOW.length - 1) return null;
  return REPAIR_STATUS_FLOW[index + 1];
}

export function RepairStatusActions({ ticketId, status }: { ticketId: string; status: RepairStatus }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const next = nextStatus(status);

  function apply(newStatus: RepairStatus) {
    startTransition(async () => {
      await updateRepairStatusAction(ticketId, newStatus);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-1.5">
      {next && (
        <Button size="sm" disabled={pending} onClick={() => apply(next)}>
          {pending ? "..." : `→ ${REPAIR_STATUS_LABELS[next]}`}
        </Button>
      )}
      <Button
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() => {
          if (!confirm("Annuler ce bon de réparation ?")) return;
          apply("ANNULE");
        }}
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
