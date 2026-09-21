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
  tone?: "emerald" | "amber" | "red" | "blue";
  hint?: string;
  delta?: number | null;
}) {
  const toneClasses = {
    emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
    red: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400",
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
  }[tone];

  return (
    <div className="group rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm shadow-zinc-900/[0.02] transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-zinc-500">{label}</p>
          <p className="mt-1.5 text-2xl font-extrabold tracking-tight text-zinc-900 tabular-nums">{value}</p>
          {hint && <p className="mt-1 truncate text-xs text-zinc-400">{hint}</p>}
          {delta !== undefined && delta !== null && (
            <p
              className={cn(
                "mt-2 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-xs font-semibold",
                delta >= 0
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                  : "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"
              )}
            >
              {delta >= 0 ? "↗" : "↘"} {Math.abs(delta).toFixed(1)}%
            </p>
          )}
        </div>
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105", toneClasses)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
