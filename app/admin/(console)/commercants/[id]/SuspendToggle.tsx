"use client";

import { useRouter } from "next/navigation";
import { ShieldOff, ShieldCheck } from "lucide-react";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { toggleBusinessSuspendedAction } from "@/lib/actions/super-admin";

export function SuspendToggle({ businessId, suspended }: { businessId: string; suspended: boolean }) {
  const router = useRouter();

  if (suspended) {
    return (
      <ConfirmButton
        variant="secondary"
        label={
          <span className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700">
            <ShieldCheck className="h-4 w-4" /> Réactiver l&apos;accès
          </span>
        }
        confirmTitle="Réactiver ce commerçant"
        confirmMessage="Les utilisateurs de ce commerce pourront à nouveau se connecter et utiliser ZINDO."
        action={() => toggleBusinessSuspendedAction(businessId, false)}
        onDone={() => router.refresh()}
      />
    );
  }

  return (
    <ConfirmButton
      variant="danger"
      label={
        <span className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50">
          <ShieldOff className="h-4 w-4" /> Suspendre l&apos;accès
        </span>
      }
      confirmTitle="Suspendre ce commerçant"
      confirmMessage="Tous les utilisateurs de ce commerce seront immédiatement empêchés de se connecter à ZINDO, jusqu'à réactivation."
      action={() => toggleBusinessSuspendedAction(businessId, true)}
      onDone={() => router.refresh()}
    />
  );
}
