"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import type { NavItem } from "@/lib/nav";
import { ZindoLogo } from "@/components/auth/ZindoLogo";
import { NAV_ICONS, ICON_BADGE_COLORS } from "./nav-icons";

export function MobileNav({
  open,
  onClose,
  items,
  businessName,
  userName,
}: {
  open: boolean;
  onClose: () => void;
  items: NavItem[];
  businessName: string;
  userName: string;
}) {
  const pathname = usePathname();
  if (!open) return null;

  const footerHrefs = ["/support", "/parametres"];
  const footerItems = footerHrefs
    .map((href) => items.find((item) => item.href === href))
    .filter((item): item is NavItem => Boolean(item));
  const mainItems = items.filter((item) => !footerHrefs.includes(item.href));

  return (
    <div className="fixed inset-0 z-40 md:hidden">
      <div className="animate-zindo-fade-in absolute inset-0 bg-zindo-ink-950/50 backdrop-blur-[2px]" onClick={onClose} />
      <div className="absolute left-0 top-0 flex h-full w-[82%] max-w-80 flex-col justify-between rounded-r-3xl bg-white text-zindo-ink-700 shadow-zindo-float dark:bg-slate-900 dark:text-slate-300">
        <div className="zindo-flag-stripe h-1 w-full shrink-0 rounded-tr-3xl" />
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="flex items-center justify-between gap-2 border-b border-zinc-100 p-4 dark:border-slate-800">
            <div className="flex min-w-0 items-center gap-3">
              <ZindoLogo size={36} className="!rounded-xl !shadow-md" />
              <div className="min-w-0">
                <p className="truncate text-[15px] font-extrabold tracking-wide text-zindo-ink-900 dark:text-white">ZINDO</p>
                <p className="truncate text-xs font-medium text-zinc-500">{businessName}</p>
              </div>
            </div>
            <button onClick={onClose} aria-label="Fermer le menu" className="shrink-0 rounded-full bg-zinc-100 p-2 text-zindo-ink-500 hover:bg-zinc-200 hover:text-zindo-ink-900 dark:bg-slate-800 dark:text-slate-300">
              <X className="h-5 w-5" />
            </button>
          </div>
          <nav className="space-y-0.5 p-3">
            {mainItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = NAV_ICONS[item.icon];
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center justify-between rounded-xl px-2.5 py-2.5 text-sm transition-colors",
                    active
                      ? "bg-zindo-green-50 font-semibold text-zindo-green-800 dark:bg-zindo-green-500/10 dark:text-zindo-green-300"
                      : "font-medium text-zindo-ink-700 active:bg-zinc-100 dark:text-slate-300 dark:active:bg-slate-800"
                  )}
                >
                  <span className="flex items-center gap-3">
                    <span
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg shadow-sm",
                        ICON_BADGE_COLORS[item.icon]
                      )}
                    >
                      <Icon className="h-4.5 w-4.5 text-white" />
                    </span>
                    {item.label}
                  </span>
                  {item.badge && (
                    <span className="rounded-md bg-zindo-gold-500/20 px-1.5 py-0.5 text-[10px] font-bold text-zindo-gold-600">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {footerItems.length > 0 && (
          <div className="space-y-0.5 border-t border-zinc-100 p-3 dark:border-slate-800">
            {footerItems.map((item) => (
              <Link
                key={item.href}
                href={
                  item.href === "/support" && pathname !== "/support"
                    ? `/support?from=${encodeURIComponent(pathname)}`
                    : item.href
                }
                onClick={onClose}
                className={cn(
                  "flex items-center rounded-xl px-3 py-2.5 text-sm transition-colors",
                  pathname === item.href
                    ? "bg-zindo-green-50 font-semibold text-zindo-green-800 dark:bg-zindo-green-500/10 dark:text-zindo-green-300"
                    : "font-medium text-zindo-ink-700 active:bg-zinc-100 dark:text-slate-300 dark:active:bg-slate-800"
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
        )}

        <Link
          href="/profil"
          onClick={onClose}
          className="m-3 mt-0 flex shrink-0 items-center gap-3 rounded-2xl border border-zinc-200/80 bg-zinc-50/70 p-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))] dark:border-slate-800 dark:bg-slate-800/50"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-zindo-green-400 to-zindo-green-600 text-sm font-bold text-white shadow-sm">
            {userName.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-zindo-ink-900 dark:text-white">{userName}</p>
            <p className="text-[11px] text-zinc-500">Mon compte</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
