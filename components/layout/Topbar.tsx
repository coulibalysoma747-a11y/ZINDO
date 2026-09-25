"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { LogOut, Menu, User as UserIcon } from "lucide-react";
import { logoutAction } from "@/lib/actions/auth";
import { MobileNav } from "./MobileNav";
import { SidebarOpenButton } from "./SidebarToggle";
import { LocationSwitcher } from "./LocationSwitcher";
import { InstallAppButton } from "@/components/InstallAppButton";
import { ZindoLogo } from "@/components/auth/ZindoLogo";
import type { NavItem } from "@/lib/nav";

type LocationOption = { id: string; name: string; type: "BOUTIQUE" | "DEPOT" };

export function Topbar({
  userName,
  role,
  navItems,
  businessName,
  locations,
  currentLocationId,
}: {
  userName: string;
  role: string;
  navItems: NavItem[];
  businessName: string;
  locations: LocationOption[];
  currentLocationId: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <header className="relative flex h-16 items-center justify-between gap-3 border-b border-zinc-200/70 bg-white/90 px-3 backdrop-blur-md sm:px-4 dark:border-slate-800 dark:bg-slate-900/90 md:px-6">
        <div className="zindo-flag-stripe absolute inset-x-0 top-0 h-1 md:hidden" />
        {/* Téléphone : bouton menu + nom du commerce, pour toujours savoir où l’on est. */}
        <div className="flex min-w-0 items-center gap-2 md:hidden">
          <button
            className="rounded-xl p-2 text-zinc-600 hover:bg-zinc-100 active:bg-zinc-200 dark:text-slate-300 dark:hover:bg-slate-800"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Ouvrir le menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link href="/dashboard" className="flex min-w-0 items-center gap-2">
            <ZindoLogo size={28} className="!rounded-lg !shadow-sm" />
            <span className="truncate text-sm font-bold text-zinc-900">{businessName}</span>
          </Link>
        </div>
        <div className="hidden items-center gap-2 md:flex">
          {/* Visible seulement quand le menu latéral a été fermé (voir SidebarToggle). */}
          <SidebarOpenButton className="hidden group-data-[sidebar=closed]/app:inline-flex" />
          <LocationSwitcher locations={locations} currentLocationId={currentLocationId} />
        </div>
        <div className="flex items-center gap-2">
          <InstallAppButton
            iconOnly
            className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-600 shadow-zindo-card hover:border-zinc-300 hover:text-zinc-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 sm:px-3"
          />
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Menu du compte"
              aria-expanded={menuOpen}
              className="flex items-center gap-2.5 rounded-xl py-1 pl-1 pr-1 transition-colors hover:bg-zinc-100 sm:pr-3 dark:hover:bg-slate-800"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-zindo-green-400 to-zindo-green-600 text-sm font-bold text-white shadow-sm ring-2 ring-white dark:ring-slate-900">
                {userName.slice(0, 1).toUpperCase()}
              </div>
              <div className="hidden text-left sm:block">
                <p className="text-sm font-semibold leading-tight text-zinc-900">{userName}</p>
                <p className="text-xs leading-tight text-zinc-500">{role}</p>
              </div>
            </button>
            {menuOpen && (
              <div className="animate-zindo-fade-in absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-1.5 shadow-zindo-float dark:border-slate-700 dark:bg-slate-900">
                <div className="px-3 pb-2 pt-1.5 sm:hidden">
                  <p className="truncate text-sm font-semibold text-zinc-900">{userName}</p>
                  <p className="text-xs text-zinc-500">{role}</p>
                </div>
                <Link
                  href="/profil"
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:hover:bg-slate-800"
                  onClick={() => setMenuOpen(false)}
                >
                  <UserIcon className="h-4 w-4" /> Mon profil
                </Link>
                <button
                  disabled={pending}
                  onClick={() => startTransition(() => logoutAction())}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                >
                  <LogOut className="h-4 w-4" /> Déconnexion
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      {/* En dehors du <header> : `backdrop-blur-sm` ci-dessus crée un containing
          block pour les descendants `position: fixed`, ce qui confinait le
          tiroir plein écran de MobileNav à la hauteur du header (64px) au lieu
          du viewport entier. */}
      <MobileNav
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        items={navItems}
        businessName={businessName}
        userName={userName}
      />
    </>
  );
}
