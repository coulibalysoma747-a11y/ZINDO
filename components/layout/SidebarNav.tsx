"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import type { NavItem } from "@/lib/nav";
import { SidebarLink } from "./SidebarLink";
import { filterNavGroups } from "./nav-icons";

/**
 * Liste des modules du menu latéral, avec — si le flag « recherche_menu »
 * est activé — un champ pour filtrer les modules par leur nom. Entrée ouvre
 * le premier module trouvé, Échap vide le champ.
 */
export function SidebarNav({
  groups,
  footerItems,
  searchable,
}: {
  groups: { title: string | null; items: NavItem[] }[];
  /** Paramètres, Aide… : affichés en bas du menu, mais trouvables aussi par la recherche. */
  footerItems: NavItem[];
  searchable: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const visible = filterNavGroups(query.trim() ? [...groups, { title: "Autres", items: footerItems }] : groups, query);
  const firstMatch = visible[0]?.items[0];

  return (
    <>
      {searchable && (
        <div className="shrink-0 px-3 pt-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setQuery("");
                if (e.key === "Enter" && firstMatch) {
                  e.preventDefault();
                  setQuery("");
                  router.push(firstMatch.href);
                }
              }}
              placeholder="Chercher un module…"
              aria-label="Chercher un module dans le menu"
              className="h-9 w-full rounded-lg border border-zinc-300 bg-zinc-50 pl-8 pr-8 text-sm text-zinc-900 outline-none transition-colors placeholder:text-zinc-500 focus:border-zindo-green-500 focus:bg-white focus:ring-2 focus:ring-zindo-green-500/15 dark:border-slate-700 dark:bg-slate-800/60"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Effacer la recherche"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700 dark:hover:bg-slate-700"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {visible.length === 0 ? (
          <p className="px-2.5 py-4 text-sm text-zinc-500">Aucun module ne correspond.</p>
        ) : (
          visible.map((group, i) => (
            <div key={group.title ?? i} className={i > 0 ? "mt-5" : undefined}>
              {group.title && (
                <p className="mb-1 px-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">{group.title}</p>
              )}
              <div className="space-y-px">
                {group.items.map((item) => (
                  <SidebarLink key={item.href} item={item} />
                ))}
              </div>
            </div>
          ))
        )}
      </nav>
    </>
  );
}
