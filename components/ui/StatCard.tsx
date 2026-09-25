import { cn } from "@/lib/cn";
import type { LucideIcon } from "lucide-react";

const TONES = {
  emerald: {
    icon: "bg-zindo-green-50 text-zindo-green-600 ring-zindo-green-600/10 dark:bg-zindo-green-500/10 dark:text-zindo-green-400",
    bar: "from-zindo-green-400 to-zindo-green-600",
  },
  amber: {
    icon: "bg-amber-50 text-amber-600 ring-amber-600/10 dark:bg-amber-500/10 dark:text-amber-400",
    bar: "from-amber-300 to-amber-500",
  },
  red: {
    icon: "bg-red-50 text-red-600 ring-red-600/10 dark:bg-red-500/10 dark:text-red-400",
    bar: "from-red-400 to-red-600",
  },
  blue: {
    icon: "bg-blue-50 text-blue-600 ring-blue-600/10 dark:bg-blue-500/10 dark:text-blue-400",
    bar: "from-blue-400 to-blue-600",
  },
} as const;

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
  tone?: keyof typeof TONES;
  hint?: string;
  delta?: number | null;
}) {
  const t = TONES[tone];

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-zinc-200/70 bg-white p-5 shadow-zindo-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-zindo-raised dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
      {/* Fin liseré coloré en tête de carte : repère la nature du chiffre d'un coup d'œil. */}
      <div className={cn("absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r opacity-80", t.bar)} />
      <div className="flex items-start justify-between gap-3">
        <p className="truncate pt-0.5 text-[13px] font-medium text-zinc-500">{label}</p>
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset transition-transform duration-200 group-hover:scale-105",
            t.icon
          )}
        >
          <Icon className="h-[18px] w-[18px]" />
        </div>
      </div>
      <p className="mt-2 truncate text-[26px] font-bold leading-tight tracking-tight text-zinc-900 tabular-nums">{value}</p>
      {(hint || (delta !== undefined && delta !== null)) && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {delta !== undefined && delta !== null && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-semibold tabular-nums",
                delta >= 0
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                  : "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"
              )}
            >
              {delta >= 0 ? "↗" : "↘"} {Math.abs(delta).toFixed(1)}%
            </span>
          )}
          {hint && <p className="min-w-0 truncate text-xs text-zinc-400">{hint}</p>}
        </div>
      )}
    </div>
  );
}
