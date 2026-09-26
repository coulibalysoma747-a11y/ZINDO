"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export type SettingsTab = { key: string; label: string; content: ReactNode };

/**
 * Onglets de la page Paramètres (flag parametres_onglets). Tous les onglets
 * restent montés et seuls les inactifs sont masqués : une saisie en cours
 * dans un formulaire n'est pas perdue quand on passe d'un onglet à l'autre.
 * L'onglet actif est reporté dans l'adresse (?onglet=…) sans rechargement,
 * pour pouvoir partager un lien direct ou retrouver l'onglet après un F5.
 */
export function SettingsTabs({ tabs, initialTab }: { tabs: SettingsTab[]; initialTab?: string }) {
  const [active, setActive] = useState(
    tabs.some((t) => t.key === initialTab) ? (initialTab as string) : tabs[0]?.key
  );

  // Sur téléphone, la barre d'onglets défile horizontalement : l'onglet
  // ouvert par un lien (?onglet=…) peut se trouver hors de l'écran.
  const navRef = useRef<HTMLElement>(null);
  useEffect(() => {
    navRef.current
      ?.querySelector<HTMLElement>('[aria-current="page"]')
      ?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [active]);

  function select(key: string) {
    setActive(key);
    const url = new URL(window.location.href);
    url.searchParams.set("onglet", key);
    window.history.replaceState(null, "", url);
  }

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
      <nav
        ref={navRef}
        aria-label="Sections des paramètres"
        className="flex gap-1 overflow-x-auto pb-1 lg:sticky lg:top-4 lg:w-56 lg:shrink-0 lg:flex-col lg:overflow-visible"
      >
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => select(t.key)}
            aria-current={active === t.key ? "page" : undefined}
            className={cn(
              "shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors",
              active === t.key
                ? "bg-zinc-900 text-white dark:bg-slate-100 dark:text-slate-900"
                : "text-zinc-600 hover:bg-zinc-100 dark:text-slate-300 dark:hover:bg-slate-800"
            )}
          >
            {t.label}
          </button>
        ))}
      </nav>
      <div className="min-w-0 flex-1">
        {tabs.map((t) => (
          <div key={t.key} hidden={active !== t.key} className="space-y-6">
            {t.content}
          </div>
        ))}
      </div>
    </div>
  );
}
