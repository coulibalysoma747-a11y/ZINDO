"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import type { NavItem } from "@/lib/nav";
import { ZindoLogo } from "@/components/auth/ZindoLogo";
import { NAV_ICONS, groupNavItems } from "./nav-icons";

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
  const groups = groupNavItems(items.filter((item) => !footerHrefs.includes(item.href)));

  return (
    <div className="fixed inset-0 z-40 md:hidden">
      <div className="animate-zindo-fade-in absolute inset-0 bg-zindo-ink-950/50 backdrop-blur-[2px]" onClick={onClose} />
      <div className="absolute left-0 top-0 flex h-full w-[82%] max-w-80 flex-col justify-between bg-white text-zindo-ink-700 shadow-zindo-float dark:bg-slate-900 dark:text-slate-300">
                <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="flex items-center justify-between gap-2 border-b border-zinc-100 p-4 dark:border-slate-800">
            <div className="flex min-w-0 items-center gap-3">
              <ZindoLogo size={32} className="!rounded-lg !shadow-none" />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-zinc-900">ZINDO</p>
                <p className="truncate text-xs font-medium text-zinc-500">{businessName}</p>
              </div>
            </div>
            <button onClick={onClose} aria-label="Fermer le menu" className="shrink-0 rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-slate-800">
              <X className="h-5 w-5" />
            </button>
          </div>
          <nav className="px-3 py-3">
            {groups.map((group, i) => (
              <div key={group.title ?? i} className={i > 0 ? "mt-5" : undefined}>
                {group.title && (
                  <p className="mb-1 px-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">{group.title}</p>
                )}
                <div className="space-y-px">
                  {group.items.map((item) => {
                    const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                    const Icon = NAV_ICONS[item.icon];
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onClose}
                        className={cn(
                          "flex items-center justify-between gap-2 rounded-lg px-2.5 py-2.5 text-sm transition-colors",
                          active
                            ? "bg-zindo-green-50 font-semibold text-zindo-green-800 dark:bg-zindo-green-500/10 dark:text-zindo-green-300"
                            : "font-medium text-zinc-700 active:bg-zinc-100 dark:text-slate-300 dark:active:bg-slate-800"
                        )}
                      >
                        <span className="flex min-w-0 items-center gap-3">
                          <Icon
                            className={cn(
                              "h-[18px] w-[18px] shrink-0",
                              active ? "text-zindo-green-600 dark:text-zindo-green-400" : "text-zinc-400"
                            )}
                          />
                          <span className="truncate">{item.label}</span>
                        </span>
                        {item.badge && (
                          <span className="shrink-0 rounded border border-zinc-200 px-1 text-[10px] font-semibold text-zinc-500">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
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
                  "flex items-center rounded-lg px-2.5 py-2.5 text-sm transition-colors",
                  pathname === item.href
                    ? "bg-zindo-green-50 font-semibold text-zindo-green-800 dark:bg-zindo-green-500/10 dark:text-zindo-green-300"
                    : "font-medium text-zinc-700 active:bg-zinc-100 dark:text-slate-300 dark:active:bg-slate-800"
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
          className="flex shrink-0 items-center gap-3 border-t border-zinc-200 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] dark:border-slate-800"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white dark:bg-slate-700">
            {userName.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-zinc-900">{userName}</p>
            <p className="text-[11px] text-zinc-500">Mon compte</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
