"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ArrowRight } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Carte de module cliquable (page Aide & support) : repliée, elle montre la
 * description courte ; dépliée, elle ajoute l'explication détaillée et un
 * lien direct vers la page du module. L'icône est reçue déjà rendue
 * (`icon: ReactNode`, pas le composant lui-même) — un composant ne peut pas
 * être passé tel quel en prop à un composant client depuis un composant
 * serveur, seul un élément déjà rendu le peut.
 */
export function ModuleCard({
  href,
  label,
  icon,
  badge,
  shortDescription,
  longDescription,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: React.ReactNode;
  shortDescription: string;
  longDescription: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white dark:border-slate-700 dark:bg-slate-900">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-start gap-3 p-3.5 text-left"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zindo-green-50 text-zindo-green-600">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="font-medium text-zinc-900">{label}</p>
            {badge}
          </div>
          <p className="mt-0.5 text-xs text-zinc-500">{shortDescription}</p>
        </div>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-zinc-400 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="space-y-3 border-t border-zinc-100 px-3.5 pb-3.5 pt-3 dark:border-slate-800">
          <p className="text-sm text-zinc-600">{longDescription}</p>
          <Link
            href={href}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-zindo-green-600 hover:text-zindo-green-700"
          >
            Aller dans {label} <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}
    </div>
  );
}
