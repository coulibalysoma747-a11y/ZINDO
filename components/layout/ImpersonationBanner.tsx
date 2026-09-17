"use client";

import { UserCog } from "lucide-react";
import { stopImpersonationAction } from "@/lib/actions/impersonation";

export function ImpersonationBanner({ businessName, userName }: { businessName: string; userName: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 bg-amber-500 px-4 py-2 text-sm font-medium text-amber-950 print:hidden">
      <span className="flex items-center gap-2">
        <UserCog className="h-4 w-4 shrink-0" />
        Connecté en tant que {userName} — {businessName}
      </span>
      <form action={stopImpersonationAction}>
        <button type="submit" className="rounded-lg bg-amber-950/10 px-3 py-1 text-xs font-bold hover:bg-amber-950/20">
          Revenir à l&apos;admin
        </button>
      </form>
    </div>
  );
}
