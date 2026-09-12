"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/cn";

const PERIODS = [
  { value: "", label: "Tout" },
  { value: "aujourdhui", label: "Aujourd'hui" },
  { value: "hier", label: "Hier" },
  { value: "semaine", label: "Cette semaine" },
  { value: "mois", label: "Ce mois" },
];

export function HistoryFilters({ paramName }: { paramName: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get(paramName) ?? "";

  function select(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(paramName, value);
    else params.delete(paramName);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-1 rounded-lg border border-zinc-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900">
      {PERIODS.map((p) => (
        <button
          key={p.value}
          onClick={() => select(p.value)}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            current === p.value ? "bg-emerald-600 text-white" : "text-zinc-600 hover:bg-zinc-100"
          )}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
