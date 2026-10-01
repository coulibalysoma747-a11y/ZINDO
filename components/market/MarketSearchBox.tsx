"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, Search, X } from "lucide-react";

const DEBOUNCE_MS = 250;
const SEARCH_PATH = "/marche/recherche";

/**
 * Barre de recherche du Marché : les résultats se mettent à jour pendant la
 * frappe, comme à la caisse (la page de résultats garde ses filtres).
 */
export function MarketSearchBox() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function search(value: string) {
    const term = value.trim();
    const onSearchPage = pathname === SEARCH_PATH;
    // Hors de la page de résultats, un champ vide n'a rien à chercher.
    if (!term && !onSearchPage) return;
    const next = new URLSearchParams(onSearchPage ? params.toString() : "");
    if (term) next.set("q", term);
    else next.delete("q");
    next.delete("page");
    const query = next.toString();
    const href = query ? `${SEARCH_PATH}?${query}` : SEARCH_PATH;
    startTransition(() => (onSearchPage ? router.replace(href) : router.push(href)));
  }

  function change(value: string) {
    setQ(value);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => search(value), DEBOUNCE_MS);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (timer.current) clearTimeout(timer.current);
    search(q);
  }

  return (
    <div className="relative w-full">
      <form onSubmit={submit} role="search" className="flex h-11 w-full items-center overflow-hidden rounded-xl border border-zinc-300 bg-white shadow-sm focus-within:border-zindo-green-600 focus-within:ring-2 focus-within:ring-zindo-green-600/20">
        <Search className="ml-3 h-5 w-5 shrink-0 text-zinc-400" />
        <input
          value={q}
          onChange={(e) => change(e.target.value)}
          name="q"
          type="search"
          autoComplete="off"
          enterKeyHint="search"
          placeholder="Rechercher un produit, une marque, une boutique…"
          aria-label="Rechercher sur le Marché"
          className="h-full min-w-0 flex-1 bg-transparent px-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
        />
        {pending && <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin text-zinc-400" />}
        {q && !pending && (
          <button type="button" aria-label="Effacer" onClick={() => change("")} className="mr-1 rounded-full p-1 text-zinc-400 hover:text-zinc-700">
            <X className="h-4 w-4" />
          </button>
        )}
        <button type="submit" className="hidden h-full shrink-0 bg-zindo-green-600 px-5 text-sm font-semibold text-white hover:bg-zindo-green-700 sm:block">
          Rechercher
        </button>
      </form>
    </div>
  );
}
