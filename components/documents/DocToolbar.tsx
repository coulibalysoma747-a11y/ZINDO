import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { PrintDocumentButton } from "@/components/purchase-orders/PrintDocumentButton";

const PERIODS = [
  { value: "", label: "Tout" },
  { value: "aujourdhui", label: "Aujourd'hui" },
  { value: "hier", label: "Hier" },
  { value: "semaine", label: "Cette semaine" },
  { value: "mois", label: "Ce mois" },
];

const chip = (active: boolean) =>
  `rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
    active
      ? "border-emerald-600 bg-emerald-600 text-white"
      : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
  }`;

/** Barre au-dessus d'un document A4 : retour, filtres éventuels, impression (masquée à l'impression). */
export function DocToolbar({ backHref, backLabel, children }: { backHref: string; backLabel: string; children?: ReactNode }) {
  return (
    <div className="mb-4 space-y-3 print:hidden">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href={backHref} className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700">
          <ArrowLeft className="h-4 w-4" /> {backLabel}
        </Link>
        <PrintDocumentButton />
      </div>
      {children}
    </div>
  );
}

/**
 * Choix de la période d'un document : mêmes boutons que les écrans, plus des
 * dates précises. `extra` : autres paramètres à conserver (ex. type=ventes).
 */
export function PeriodPicker({
  basePath,
  current,
  extra,
}: {
  basePath: string;
  current: { periode?: string; du?: string; au?: string };
  extra?: Record<string, string | undefined>;
}) {
  const keep = Object.entries(extra ?? {}).filter(([, v]) => v) as [string, string][];
  const href = (periode: string) => {
    const q = new URLSearchParams(keep);
    if (periode) q.set("periode", periode);
    const s = q.toString();
    return s ? `${basePath}?${s}` : basePath;
  };
  const custom = !!(current.du || current.au);
  return (
    <div className="flex flex-wrap items-center gap-2">
      {PERIODS.map((p) => (
        <Link key={p.value} href={href(p.value)} className={chip(!custom && (current.periode ?? "") === p.value)}>
          {p.label}
        </Link>
      ))}
      <form action={basePath} className="flex flex-wrap items-center gap-2 text-xs text-zinc-600 dark:text-slate-300">
        {keep.map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
        <label className="flex items-center gap-1">
          Du
          <input
            type="date"
            name="du"
            defaultValue={current.du ?? ""}
            className="rounded-lg border border-zinc-200 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
        <label className="flex items-center gap-1">
          au
          <input
            type="date"
            name="au"
            defaultValue={current.au ?? ""}
            className="rounded-lg border border-zinc-200 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
        <button
          type="submit"
          className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 font-medium hover:bg-zinc-50 dark:border-slate-700 dark:bg-slate-900"
        >
          Afficher
        </button>
      </form>
    </div>
  );
}

/** Autres filtres d'un document (liens). */
export function DocChips({ items }: { items: { label: string; href: string; active: boolean }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {items.map((i) => (
        <Link key={i.label} href={i.href} className={chip(i.active)}>
          {i.label}
        </Link>
      ))}
    </div>
  );
}
