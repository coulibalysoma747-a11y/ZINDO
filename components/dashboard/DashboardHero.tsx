import { cn } from "@/lib/cn";

type Mini = { label: string; value: string; hint?: string; negative?: boolean };

const WIDTH = 400;
const HEIGHT = 92;

/** Courbe discrète du chiffre d'affaires (7 derniers jours), sans axes : l'évolution se lit d'un coup d'œil. */
function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const max = Math.max(1, ...values);
  const step = WIDTH / (values.length - 1);
  const pts = values.map((v, i) => [i * step, HEIGHT - 8 - (v / max) * (HEIGHT - 20)] as const);
  const line = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" className="mt-3 h-24 w-full" aria-hidden>
      <defs>
        <linearGradient id="hero-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#0f7a4a" stopOpacity="0.22" />
          <stop offset="1" stopColor="#0f7a4a" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L${WIDTH} ${HEIGHT} L0 ${HEIGHT}Z`} fill="url(#hero-fill)" />
      <path d={line} fill="none" stroke="#0f7a4a" strokeWidth="2.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/**
 * Bloc principal du tableau de bord (flag interface_pro) : le chiffre d'affaires
 * en grand, sa courbe, et les quatre chiffres qui l'expliquent à côté.
 */
export function DashboardHero({
  label,
  value,
  delta,
  hint,
  trend,
  minis,
}: {
  label: string;
  value: string;
  /** Variation en % par rapport à la période précédente (null : pas de comparaison). */
  delta?: number | null;
  hint?: string;
  trend: number[];
  minis: Mini[];
}) {
  return (
    <section className="grid gap-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-[0_1px_3px_rgb(16_24_20/0.06)] sm:p-6 lg:grid-cols-[1.2fr_1fr] lg:gap-8 dark:border-slate-800 dark:bg-slate-900">
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-zinc-500">{label}</p>
        <p className="mt-1 text-3xl font-bold tracking-tight tabular-nums text-zinc-900 sm:text-4xl dark:text-white">{value}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          {delta !== undefined && delta !== null && (
            <span className={cn("font-semibold tabular-nums", delta >= 0 ? "text-[#0f7a4a]" : "text-red-600")}>
              {delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(1)} % par rapport à la période précédente
            </span>
          )}
          {hint && <span className="text-zinc-500">{hint}</span>}
        </div>
        <Sparkline values={trend} />
      </div>
      <div className="grid content-start grid-cols-2 gap-3">
        {minis.map((m) => (
          <div key={m.label} className="rounded-xl bg-zinc-50 p-4 dark:bg-slate-800/60">
            <p className="text-[12.5px] font-medium text-zinc-500">{m.label}</p>
            <p className={cn("mt-0.5 truncate text-xl font-bold tabular-nums", m.negative ? "text-red-600" : "text-zinc-900 dark:text-white")}>{m.value}</p>
            {m.hint && <p className="mt-0.5 text-xs text-zinc-500">{m.hint}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}
