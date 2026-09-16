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
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    red: "bg-red-50 text-red-600",
    blue: "bg-blue-50 text-blue-600",
  }[tone];

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-zinc-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900">{value}</p>
          {hint && <p className="mt-1 text-xs text-zinc-400">{hint}</p>}
          {delta !== undefined && delta !== null && (
            <p className={cn("mt-1 text-xs font-medium", delta >= 0 ? "text-emerald-600" : "text-red-500")}>
              {delta >= 0 ? "↗" : "↘"} {Math.abs(delta).toFixed(1)}% vs période précédente
            </p>
          )}
        </div>
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", toneClasses)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
