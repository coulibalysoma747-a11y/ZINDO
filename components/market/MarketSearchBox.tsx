"use client";
import { vignette } from "@/lib/vignette";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BadgeCheck, Loader2, Search, Store, X } from "lucide-react";
import { formatMoney } from "@/lib/format";

type Suggestions = {
  products: { id: string; name: string; photoUrl: string | null; price: number; currency: string; shop: string; available: boolean }[];
  shops: { slug: string; name: string; city: string | null; logoUrl: string | null; verified: boolean }[];
};

const DEBOUNCE_MS = 180;

/**
 * Barre de recherche du Marché : champ large, bouton « Rechercher », et
 * suggestions de produits et de boutiques pendant la frappe (clavier :
 * flèches, Entrée, Échap).
 */
export function MarketSearchBox() {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [data, setData] = useState<Suggestions | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const term = q.trim();
    // Moins de 2 lettres : rien à chercher (le panneau est déjà masqué, voir showPanel).
    if (term.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/public/marche/suggestions?q=${encodeURIComponent(term)}`, { signal: controller.signal });
        if (res.ok) setData(await res.json());
      } catch {
        // Frappe suivante ou réseau coupé : on garde les suggestions précédentes.
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const items = [
    ...(data?.products ?? []).map((p) => ({ href: `/marche/produit/${p.id}` })),
    ...(data?.shops ?? []).map((s) => ({ href: `/marche/boutique/${s.slug}` })),
  ];

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (active >= 0 && items[active]) return go(items[active].href);
    const term = q.trim();
    go(term ? `/marche/recherche?q=${encodeURIComponent(term)}` : "/marche/recherche");
  }

  const showPanel = open && q.trim().length >= 2 && data !== null;

  return (
    <div ref={box} className="relative w-full">
      <form onSubmit={submit} role="search" className="flex h-11 w-full items-center overflow-hidden rounded-xl border border-zinc-300 bg-white shadow-sm focus-within:border-zindo-green-600 focus-within:ring-2 focus-within:ring-zindo-green-600/20">
        <Search className="ml-3 h-5 w-5 shrink-0 text-zinc-400" />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((i) => Math.min(items.length - 1, i + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((i) => Math.max(-1, i - 1));
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          name="q"
          type="search"
          autoComplete="off"
          enterKeyHint="search"
          placeholder="Rechercher un produit, une marque, une boutique…"
          aria-label="Rechercher sur le Marché"
          className="h-full min-w-0 flex-1 bg-transparent px-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
        />
        {loading && <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin text-zinc-400" />}
        {q && !loading && (
          <button type="button" aria-label="Effacer" onClick={() => setQ("")} className="mr-1 rounded-full p-1 text-zinc-400 hover:text-zinc-700">
            <X className="h-4 w-4" />
          </button>
        )}
        <button type="submit" className="hidden h-full shrink-0 bg-zindo-green-600 px-5 text-sm font-semibold text-white hover:bg-zindo-green-700 sm:block">
          Rechercher
        </button>
      </form>

      {showPanel && (
        <div className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl">
          {items.length === 0 ? (
            <p className="px-4 py-3 text-sm text-zinc-500">Aucune suggestion. Appuyez sur Entrée pour chercher « {q.trim()} ».</p>
          ) : (
            <ul role="listbox">
              {data!.products.map((p, i) => (
                <li key={p.id} role="option" aria-selected={active === i}>
                  <button type="button" onMouseEnter={() => setActive(i)} onClick={() => go(`/marche/produit/${p.id}`)} className={`flex w-full items-center gap-3 px-4 py-2.5 text-left ${active === i ? "bg-zinc-50" : ""}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={vignette(p.photoUrl, 40) ?? ""} loading="lazy" decoding="async" alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover ring-1 ring-zinc-200" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-zinc-900">{p.name}</span>
                      <span className="block truncate text-xs text-zinc-500">{p.shop}</span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block text-sm font-bold text-zinc-900">{formatMoney(p.price, p.currency)}</span>
                      {!p.available && <span className="block text-[11px] text-red-600">Rupture</span>}
                    </span>
                  </button>
                </li>
              ))}
              {data!.shops.length > 0 && <li className="border-t border-zinc-100 px-4 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Boutiques</li>}
              {data!.shops.map((s, j) => {
                const i = data!.products.length + j;
                return (
                  <li key={s.slug} role="option" aria-selected={active === i}>
                    <button type="button" onMouseEnter={() => setActive(i)} onClick={() => go(`/marche/boutique/${s.slug}`)} className={`flex w-full items-center gap-3 px-4 py-2.5 text-left ${active === i ? "bg-zinc-50" : ""}`}>
                      <Store className="h-5 w-5 shrink-0 text-zinc-400" />
                      <span className="flex min-w-0 items-center gap-1 text-sm font-medium text-zinc-900">
                        <span className="truncate">{s.name}</span>
                        {s.verified && <BadgeCheck className="h-4 w-4 shrink-0 text-sky-600" />}
                      </span>
                      {s.city && <span className="ml-auto shrink-0 text-xs text-zinc-500">{s.city}</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <button type="button" onClick={() => submit()} className="flex w-full items-center gap-2 border-t border-zinc-100 bg-zinc-50 px-4 py-2.5 text-sm font-semibold text-zindo-green-700 hover:bg-zinc-100">
            <Search className="h-4 w-4" /> Voir tous les résultats pour « {q.trim()} »
          </button>
        </div>
      )}
    </div>
  );
}
