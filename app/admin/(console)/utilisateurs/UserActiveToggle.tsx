"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleUserActiveAction } from "@/lib/actions/super-admin";

export function UserActiveToggle({ userId, active }: { userId: string; active: boolean }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await toggleUserActiveAction(userId, !active);
          router.refresh();
        })
      }
      className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
        active
          ? "border-red-200 text-red-600 hover:bg-red-50"
          : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
      }`}
    >
      {active ? "Désactiver" : "Réactiver"}
    </button>
  );
}
