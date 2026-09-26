"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Package, Users, Truck, Receipt, Loader2, CornerDownLeft, UserCircle } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatMoney, formatDateTime } from "@/lib/format";
import { globalSearchAction, type GlobalSearchResult } from "@/lib/actions/global-search";
import type { NavItem } from "@/lib/nav";
import { NAV_ICONS } from "./nav-icons";

type Item = { key: string; href: string; title: string; subtitle: string; icon: React.ComponentType<{ className?: string }> };

/** Minuscules sans accents : « parametre » trouve « Paramètres ». */
function normalize(text: string) {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

const SECTIONS: { key: keyof GlobalSearchResult; title: string }[] = [
  { key: "products", title: "Produits" },
  { key: "customers", title: "Clients" },
  { key: "suppliers", title: "Fournisseurs" },
  { key: "sales", title: "Ventes" },
];

function toItems(result: GlobalSearchResult, currency: string): Record<keyof GlobalSearchResult, Item[]> {
  return {
    products: result.products.map((p) => ({
      key: `p-${p.id}`,
      href: `/produits/${p.id}`,
      title: p.name,
      subtitle: `${p.reference} · ${formatMoney(p.salePrice, currency)}`,
      icon: Package,
    })),
    customers: result.customers.map((c) => ({
      key: `c-${c.id}`,
      href: `/clients/${c.id}`,
      title: c.name,
      subtitle: c.phone ?? "Sans téléphone",
      icon: Users,
    })),
    suppliers: result.suppliers.map((s) => ({
      key: `s-${s.id}`,
      href: `/fournisseurs/${s.id}`,
      title: s.name,
      subtitle: [s.company, s.phone].filter(Boolean).join(" · ") || "Fournisseur",
      icon: Truck,
    })),
    sales: result.sales.map((v) => ({
      key: `v-${v.id}`,
      href: `/ventes/${v.id}`,
      title: `Vente ${v.number}`,
      subtitle: `${formatMoney(v.total, currency)} · ${formatDateTime(v.createdAt)}`,
      icon: Receipt,
    })),
  };
}

/**
 * Barre de recherche globale de l'en-tête (flag « recherche_globale ») :
 * produits, clients, fournisseurs et ventes au même endroit. S'ouvre au clic
 * ou avec Ctrl K (Cmd K sur Mac) ; flèches haut/bas puis Entrée pour ouvrir.
 */
export function GlobalSearch({ currency, navItems }: { currency: string; navItems: NavItem[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<GlobalSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const requestId = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Recherche lancée 250 ms après la dernière frappe ; une réponse arrivée
  // après une plus récente est ignorée (le compteur requestId l'écarte).
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return;
    const id = ++requestId.current;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await globalSearchAction(trimmed);
        if (id === requestId.current) {
          setResult(res);
          setActiveIndex(0);
        }
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  const grouped = useMemo(() => (result ? toItems(result, currency) : null), [result, currency]);
  const tooShort = query.trim().length < 2;

  // Pages de l'application : filtrées sur place (aucun appel au serveur),
  // parmi les seules entrées du menu que ce rôle voit déjà.
  const pages = useMemo<Item[]>(() => {
    const q = normalize(query.trim());
    if (q.length < 2) return [];
    const all = [
      ...navItems.map((item) => ({ label: item.label, href: item.href, icon: NAV_ICONS[item.icon] })),
      { label: "Mon profil", href: "/profil", icon: UserCircle },
    ];
    return all
      .filter((p) => normalize(p.label).includes(q))
      .slice(0, 6)
      .map((p) => ({ key: `page-${p.href}`, href: p.href, title: p.label, subtitle: "Page", icon: p.icon }));
  }, [query, navItems]);

  const flat = useMemo(
    () => [...pages, ...(grouped ? SECTIONS.flatMap((s) => grouped[s.key]) : [])],
    [pages, grouped]
  );

  function close() {
    setOpen(false);
    setQuery("");
    setResult(null);
    setLoading(false);
  }

  function go(item: Item) {
    close();
    router.push(item.href);
  }

  function onInputKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") close();
    if (tooShort || flat.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % flat.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + flat.length) % flat.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(flat[activeIndex]);
    }
  }

  let runningIndex = -1;

  return (
    <>
      {/* Ordinateur : champ cliquable ; téléphone : simple icône. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden h-9 w-72 items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-500 transition-colors hover:border-zinc-300 hover:bg-white lg:flex dark:border-slate-700 dark:bg-slate-800/60"
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-left">Rechercher…</span>
        <kbd className="rounded border border-zinc-200 bg-white px-1.5 text-[11px] font-medium text-zinc-500 dark:border-slate-600 dark:bg-slate-900">
          Ctrl K
        </kbd>
      </button>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Rechercher"
        className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-100 lg:hidden dark:text-slate-300 dark:hover:bg-slate-800"
      >
        <Search className="h-5 w-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-3 pt-[8vh] sm:p-4 sm:pt-[12vh]">
          <div className="animate-zindo-fade-in absolute inset-0 bg-zindo-ink-950/40" onClick={close} />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Recherche globale"
            className="animate-zindo-fade-in relative flex max-h-[75vh] w-full max-w-xl flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-zindo-float dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="flex items-center gap-3 border-b border-zinc-200 px-4 dark:border-slate-700">
              {loading ? (
                <Loader2 className="h-5 w-5 shrink-0 animate-spin text-zinc-400" />
              ) : (
                <Search className="h-5 w-5 shrink-0 text-zinc-400" />
              )}
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onInputKey}
                placeholder="Produit, référence, code-barres, client, fournisseur, n° de vente…"
                aria-label="Rechercher"
                className="h-14 min-w-0 flex-1 bg-transparent text-base text-zinc-900 outline-none placeholder:text-zinc-400"
              />
              <button
                type="button"
                onClick={close}
                className="shrink-0 rounded border border-zinc-200 px-1.5 py-0.5 text-[11px] font-medium text-zinc-500 hover:bg-zinc-50 dark:border-slate-600"
              >
                Échap
              </button>
            </div>

            <div className="overflow-y-auto p-2">
              {tooShort ? (
                <p className="px-3 py-8 text-center text-sm text-zinc-500">Tapez au moins 2 caractères.</p>
              ) : grouped && flat.length === 0 && !loading ? (
                <p className="px-3 py-8 text-center text-sm text-zinc-500">
                  Aucun résultat pour « {query.trim()} ».
                </p>
              ) : pages.length > 0 || grouped ? (
                [
                  { key: "pages", title: "Pages", items: pages },
                  ...(grouped ? SECTIONS.map((s) => ({ key: s.key, title: s.title, items: grouped[s.key] })) : []),
                ].map((section) => {
                  const items = section.items;
                  if (items.length === 0) return null;
                  return (
                    <div key={section.key} className="mb-1">
                      <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">
                        {section.title}
                      </p>
                      {items.map((item) => {
                        runningIndex++;
                        const index = runningIndex;
                        const active = index === activeIndex;
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.key}
                            type="button"
                            onClick={() => go(item)}
                            onMouseMove={() => setActiveIndex(index)}
                            className={cn(
                              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left",
                              active ? "bg-zindo-green-50 dark:bg-zindo-green-500/10" : "hover:bg-zinc-50 dark:hover:bg-slate-800"
                            )}
                          >
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500 dark:bg-slate-800">
                              <Icon className="h-4 w-4" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium text-zinc-900">{item.title}</span>
                              <span className="block truncate text-xs text-zinc-500 tabular-nums">{item.subtitle}</span>
                            </span>
                            {active && <CornerDownLeft className="h-4 w-4 shrink-0 text-zinc-400" />}
                          </button>
                        );
                      })}
                    </div>
                  );
                })
              ) : (
                <p className="px-3 py-8 text-center text-sm text-zinc-500">Recherche…</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
