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
    <div className="group rounded-xl border border-zinc-200 bg-white p-5 shadow-zindo-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-zindo-raised dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
      <div className="flex items-center justify-between gap-3">
        <p className="truncate text-[13px] font-medium text-zinc-500">{label}</p>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500 transition-colors group-hover:bg-zindo-blue-50 group-hover:text-zindo-blue-600 dark:bg-slate-800 dark:text-slate-400">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p
        className={cn(
          "mt-3 truncate text-2xl font-semibold tracking-tight tabular-nums",
          tone === "red" ? "text-red-600" : "text-zinc-900 dark:text-white"
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
