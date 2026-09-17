"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Truck, PackageCheck } from "lucide-react";
import { updateShipmentStatusAction } from "@/lib/actions/shipments";
import type { ShipmentStatus } from "@/lib/db-types";

export function ShipmentStatusButtons({ shipmentId, status }: { shipmentId: string; status: ShipmentStatus }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function setStatus(next: ShipmentStatus) {
    startTransition(async () => {
      await updateShipmentStatusAction(shipmentId, next);
      router.refresh();
    });
  }

  if (status === "RETIRE") return null;

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => setStatus(status === "ENVOYE" ? "ARRIVE" : "RETIRE")}
      title={status === "ENVOYE" ? "Marquer comme arrivé" : "Marquer comme retiré"}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 hover:border-zindo-green-300 hover:bg-zindo-green-50 hover:text-zindo-green-700"
    >
      {status === "ENVOYE" ? <Truck className="h-4 w-4" /> : <PackageCheck className="h-4 w-4" />}
    </button>
  );
}
