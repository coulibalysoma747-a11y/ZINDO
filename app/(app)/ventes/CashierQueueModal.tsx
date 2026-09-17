"use client";

import { useEffect, useState, useTransition } from "react";
import { Clock, Loader2, User } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { formatMoney } from "@/lib/format";
import {
  getPendingCartsAction,
  claimPendingCartAction,
  type PendingCartSummary,
  type ClaimedCart,
} from "@/lib/actions/cashier-queue";

function timeAgo(iso: string): string {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `${minutes} min`;
  return `${Math.round(minutes / 60)} h`;
}

export function CashierQueueModal({
  open,
  onClose,
  locationId,
  currency,
  onClaim,
}: {
  open: boolean;
  onClose: () => void;
  locationId: string;
  currency: string;
  onClaim: (cart: ClaimedCart) => void;
}) {
  const [carts, setCarts] = useState<PendingCartSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    Promise.resolve().then(async () => {
      setCarts(null);
      setError(null);
      setCarts(await getPendingCartsAction(locationId));
    });
  }, [open, locationId]);

  function claim(id: string) {
    setError(null);
    startTransition(async () => {
      const result = await claimPendingCartAction(id);
      if ("error" in result) {
        setError(result.error);
        setCarts((prev) => (prev ? prev.filter((c) => c.id !== id) : prev));
        return;
      }
      onClaim(result.cart);
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="File d'attente — caisse">
      <div className="space-y-2">
        {carts === null && (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-zinc-400">
            <Loader2 className="h-4 w-4 animate-spin" /> Chargement...
          </div>
        )}
        {carts?.length === 0 && <p className="py-6 text-center text-sm text-zinc-500">Aucun panier en attente.</p>}
        {carts?.map((cart) => (
          <div key={cart.id} className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 p-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-zinc-900">
                {cart.customerName ?? "Client anonyme"} — {cart.itemCount} article{cart.itemCount > 1 ? "s" : ""}
              </p>
              <p className="flex items-center gap-2 text-xs text-zinc-400">
                <User className="h-3 w-3" /> {cart.createdByName}
                <Clock className="h-3 w-3" /> {timeAgo(cart.createdAt)}
                <span className="font-medium text-zinc-600">{formatMoney(cart.total, currency)}</span>
              </p>
            </div>
            <Button type="button" size="sm" disabled={pending} onClick={() => claim(cart.id)}>
              Récupérer
            </Button>
          </div>
        ))}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </Modal>
  );
}
