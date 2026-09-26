import { cn } from "@/lib/cn";
import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "emerald",
  hint,
  /** % de variation vs une période de référence (ex. période précédente) — null quand aucune comparaison n'est disponible. */
  delta,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  /** Seul "red" change l'apparence (valeur négative à signaler) : les autres tons restent neutres, par sobriété. */
  tone?: "emerald" | "amber" | "red" | "blue";
  hint?: string;
  delta?: number | null;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-3">
        <p className="truncate text-[13px] font-medium text-zinc-500">{label}</p>
        <Icon className="h-4 w-4 shrink-0 text-zinc-400" />
      </div>
      <p
        className={cn(
          "mt-2 truncate text-2xl font-semibold tracking-tight tabular-nums",
          tone === "red" ? "text-red-600" : "text-zinc-900"
        )}
      >
        {value}
      </p>
      {(hint || (delta !== undefined && delta !== null)) && (
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          {delta !== undefined && delta !== null && (
            <span className={cn("font-semibold tabular-nums", delta >= 0 ? "text-emerald-600" : "text-red-600")}>
              {delta >= 0 ? "+" : "−"}
              {Math.abs(delta).toFixed(1)} %
            </span>
          )}
          {hint && <span className="min-w-0 truncate text-zinc-500">{hint}</span>}
        </div>
      )}
    </div>
  );
}
