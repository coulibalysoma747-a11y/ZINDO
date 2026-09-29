"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, Menu, X } from "lucide-react";
import { ZindoLogo } from "@/components/auth/ZindoLogo";

type Item = { label: string; href: string; text: string };
type Entry = { label: string; href?: string; items?: Item[] };

const NAV: Entry[] = [
  {
    label: "Produit",
    items: [
      { label: "Caisse", href: "/fonctionnalites/caisse-hors-ligne", text: "Encaisser vite, même sans Internet" },
      { label: "Stock", href: "/fonctionnalites/gestion-de-stock", text: "Entrées, sorties, alertes, inventaire" },
      { label: "Crédits clients", href: "/fonctionnalites/credits-clients", text: "Qui vous doit combien, et depuis quand" },
      { label: "Factures et devis", href: "/fonctionnalites/facturation", text: "Documents A4 avec QR code" },
      { label: "Toutes les fonctionnalités", href: "/fonctionnalites", text: "La liste complète" },
    ],
  },
  {
    label: "Solutions",
    items: [
      { label: "Par métier", href: "/#metiers", text: "Quincaillerie, pièces, pharmacie, maquis…" },
      { label: "Pour les PME", href: "/fonctionnalites/logiciel-gestion-pme", text: "Plusieurs boutiques, dépôts et employés" },
      { label: "Marché ZINDO", href: "/marche", text: "Vendez vos produits en ligne" },
    ],
  },
  { label: "Tarifs", href: "/#tarifs" },
  { label: "Aide", href: "/#faq" },
];

/**
 * En-tête de la page d'accueil : transparent sur le haut de page sombre,
 * blanc dès que l'on fait défiler. Menus déroulants au survol ou au clic.
 */
export function AccueilProHeader({ variant = "transparent" }: { variant?: "transparent" | "light" }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [mobile, setMobile] = useState(false);
  const nav = useRef<HTMLElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    const onClick = (e: MouseEvent) => {
      if (nav.current && !nav.current.contains(e.target as Node)) setOpen(null);
    };
    document.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("mousedown", onClick);
    };
  }, []);

  const light = scrolled || mobile || variant === "light";
  const link = light ? "text-zindo-ink-700 hover:text-zindo-ink-900" : "text-white/80 hover:text-white";

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-[background-color,box-shadow,border-color] duration-300 ${
        light ? "border-b border-zinc-200/80 bg-white/90 shadow-sm backdrop-blur-md" : "border-b border-transparent bg-transparent"
      }`}
    >
      <div aria-hidden className="zindo-flag-stripe h-0.5 w-full" />
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5" aria-label="ZINDO, accueil">
          <ZindoLogo size={32} />
          <span className={`text-lg font-bold tracking-tight transition-colors ${light ? "text-zindo-ink-900" : "text-white"}`}>ZINDO</span>
        </Link>

        <nav ref={nav} aria-label="Navigation principale" className="hidden flex-1 items-center gap-1 lg:flex">
          {NAV.map((entry) =>
            entry.items ? (
              <div key={entry.label} className="relative" onMouseEnter={() => setOpen(entry.label)} onMouseLeave={() => setOpen(null)}>
                <button
                  type="button"
                  aria-expanded={open === entry.label}
                  onClick={() => setOpen((o) => (o === entry.label ? null : entry.label))}
                  className={`flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${link}`}
                >
                  {entry.label}
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open === entry.label ? "rotate-180" : ""}`} />
                </button>
                {open === entry.label && (
                  <div className="absolute left-0 top-full pt-2">
                    <div className="zindo-appear w-80 rounded-2xl border border-zinc-200 bg-white p-2 shadow-xl">
                      {entry.items.map((item) => (
                        <Link key={item.href} href={item.href} onClick={() => setOpen(null)} className="block rounded-xl px-3 py-2.5 transition-colors hover:bg-zinc-50">
                          <span className="block text-sm font-semibold text-zindo-ink-900">{item.label}</span>
                          <span className="block text-xs text-zinc-500">{item.text}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link key={entry.label} href={entry.href!} className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${link}`}>
                {entry.label}
              </Link>
            )
          )}
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/en" className={`hidden rounded-lg px-2 py-2 text-xs font-semibold transition-colors sm:block ${link}`} hrefLang="en">
            EN
          </Link>
          <Link href="/login" className={`hidden rounded-lg px-3 py-2 text-sm font-medium transition-colors sm:block ${link}`}>
            Se connecter
          </Link>
          <Link
            href="/inscription"
            className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              light ? "bg-zindo-green-500 text-white hover:bg-zindo-green-600" : "bg-white text-zindo-green-800 hover:bg-zindo-green-50"
            }`}
          >
            Essai gratuit
          </Link>
          <button
            type="button"
            onClick={() => setMobile((m) => !m)}
            aria-label={mobile ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={mobile}
            className={`flex h-9 w-9 items-center justify-center rounded-lg lg:hidden ${light ? "text-zindo-ink-900 hover:bg-zinc-100" : "text-white hover:bg-white/10"}`}
          >
            {mobile ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobile && (
        <div className="max-h-[calc(100vh-4.5rem)] overflow-y-auto border-t border-zinc-200 bg-white px-4 pb-6 pt-2 lg:hidden">
          {NAV.map((entry) => (
            <div key={entry.label} className="border-b border-zinc-100 py-3">
              {entry.items ? (
                <>
                  <p className="px-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">{entry.label}</p>
                  {entry.items.map((item) => (
                    <Link key={item.href} href={item.href} onClick={() => setMobile(false)} className="block rounded-lg px-2 py-2 text-[15px] font-medium text-zindo-ink-900">
                      {item.label}
                    </Link>
                  ))}
                </>
              ) : (
                <Link href={entry.href!} onClick={() => setMobile(false)} className="block rounded-lg px-2 py-1 text-[15px] font-medium text-zindo-ink-900">
                  {entry.label}
                </Link>
              )}
            </div>
          ))}
          <div className="mt-4 grid gap-2">
            <Link href="/login" className="rounded-lg border border-zinc-300 py-3 text-center text-sm font-semibold text-zindo-ink-900">
              Se connecter
            </Link>
            <Link href="/en" hrefLang="en" className="py-2 text-center text-sm text-zinc-500">
              English version
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
