"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { LogOut, Menu, User as UserIcon } from "lucide-react";
import { logoutAction } from "@/lib/actions/auth";
import { MobileNav } from "./MobileNav";
import { LocationSwitcher } from "./LocationSwitcher";
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
    <header className="flex h-16 items-center justify-between border-b border-zinc-200 bg-white px-4 dark:border-slate-700 dark:bg-slate-900 md:px-6">
      <button
        className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 md:hidden"
        onClick={() => setMobileNavOpen(true)}
        aria-label="Ouvrir le menu"
      >
        <Menu className="h-5 w-5" />
      </button>
      <div className="hidden md:block">
        <LocationSwitcher locations={locations} currentLocationId={currentLocationId} />
      </div>
      <div className="relative">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-zinc-50"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zindo-orange-100 text-sm font-semibold text-zindo-orange-700">
            {userName.slice(0, 1).toUpperCase()}
          </div>
          <div className="hidden text-left sm:block">
            <p className="text-sm font-medium text-zinc-900">{userName}</p>
            <p className="text-xs text-zinc-500">{role}</p>
          </div>
        </button>
        {menuOpen && (
          <div className="absolute right-0 z-20 mt-2 w-48 rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
            <Link
              href="/profil"
              className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 dark:hover:bg-slate-800"
              onClick={() => setMenuOpen(false)}
            >
              <UserIcon className="h-4 w-4" /> Mon profil
            </Link>
            <button
              disabled={pending}
              onClick={() => startTransition(() => logoutAction())}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
            >
              <LogOut className="h-4 w-4" /> Déconnexion
            </button>
          </div>
        )}
      </div>
      <MobileNav
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        items={navItems}
        businessName={businessName}
      />
    </header>
  );
}
