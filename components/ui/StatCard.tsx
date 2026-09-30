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
  solid,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  /** Seul "red" change l'apparence (valeur négative à signaler) : les autres tons restent neutres, par sobriété. */
  tone?: "emerald" | "amber" | "red" | "blue";
  hint?: string;
  delta?: number | null;
  /** Tuile pleine de couleur (nouvelle interface) : fond coloré, texte blanc, grande icône en filigrane. */
  solid?: "green" | "gold" | "red" | "teal" | "blue" | "violet" | "orange" | "slate";
}) {
  if (solid) {
    const bg = {
      green: "from-[#10844a] to-[#0b6b3a]",
      gold: "from-[#d99a12] to-[#b77f08]",
      red: "from-[#d33a30] to-[#b22a22]",
      teal: "from-[#0f8c8c] to-[#0b7070]",
      blue: "from-[#2f6fe0] to-[#2456b8]",
      violet: "from-[#7c4ddb] to-[#6436c2]",
      orange: "from-[#e06a1f] to-[#c45612]",
      slate: "from-[#3f4b5b] to-[#2c3542]",
    }[solid];
    return (
      <div className={cn("relative overflow-hidden rounded-xl bg-gradient-to-br p-5 text-white shadow-[0_8px_20px_-10px_rgb(0_0_0/0.45)]", bg)}>
        <Icon aria-hidden className="pointer-events-none absolute -bottom-3 -right-3 h-20 w-20 text-white/15" />
        <p className="relative truncate text-[12px] font-semibold uppercase tracking-wide text-white/85">{label}</p>
        <p className="relative mt-2 truncate text-2xl font-bold tracking-tight tabular-nums">{value}</p>
        {(hint || (delta !== undefined && delta !== null)) && (
          <div className="relative mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-white/85">
            {delta !== undefined && delta !== null && (
              <span className="rounded-full bg-white/20 px-1.5 py-0.5 font-semibold tabular-nums">
                {delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(1)} %
              </span>
            )}
            {hint && <span className="min-w-0 truncate">{hint}</span>}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-300/80 bg-white p-5 shadow-[0_1px_3px_rgb(16_24_20/0.08)] dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
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
