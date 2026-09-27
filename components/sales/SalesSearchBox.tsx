"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X, Loader2 } from "lucide-react";

/**
 * Recherche dans l'historique des ventes (flag recherche_ventes) : n° de
 * ticket, vendeur, client, total ou montant payé exact. Met à jour le
 * paramètre « q » de l'adresse (la période choisie est gardée).
 */
export function SalesSearchBox({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(initialQuery);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const current = searchParams.get("q") ?? "";
    if (value.trim() === current) return;
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value.trim()) params.set("q", value.trim());
      else params.delete("q");
      startTransition(() => router.replace(`${pathname}?${params.toString()}`, { scroll: false }));
    }, 400);
    return () => clearTimeout(timer);
  }, [value, searchParams, pathname, router]);

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Rechercher : n° de ticket, vendeur, client, montant…"
        aria-label="Rechercher une vente"
        autoComplete="off"
        className="w-full rounded-xl border border-zinc-200 bg-white py-3 pl-11 pr-11 text-base text-zinc-900 placeholder:text-zinc-400 focus:border-zindo-green-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
      />
      {pending ? (
        <Loader2 className="absolute right-3.5 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-zinc-400" />
      ) : (
        value && (
          <button
            type="button"
            onClick={() => setValue("")}
            aria-label="Effacer la recherche"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        )
      )}
    </div>
  );
}
