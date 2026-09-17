"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { PackageCheck, PackageX } from "lucide-react";
import { markSaleUnclaimedAction, markSaleClaimedAction } from "@/lib/actions/sales";

export function UnclaimedToggle({ saleId, unclaimed }: { saleId: string; unclaimed: boolean }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function run() {
    startTransition(async () => {
      await (unclaimed ? markSaleClaimedAction(saleId) : markSaleUnclaimedAction(saleId));
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={run}
      disabled={pending}
      title={unclaimed ? "Marquer comme retiré" : "Marquer : payé mais pas encore emporté"}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium ${
        unclaimed
          ? "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
          : "border-zinc-200 text-zinc-600 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700"
      }`}
    >
      {unclaimed ? <PackageCheck className="h-3.5 w-3.5" /> : <PackageX className="h-3.5 w-3.5" />}
      {unclaimed ? "Retiré ?" : "À retirer"}
    </button>
  );
}
