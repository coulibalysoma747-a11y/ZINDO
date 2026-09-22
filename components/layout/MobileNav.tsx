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
}: {
  open: boolean;
  onClose: () => void;
  items: NavItem[];
  businessName: string;
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
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute left-0 top-0 flex h-full w-72 flex-col justify-between bg-white text-zindo-ink-700 shadow-xl">
        <div className="zindo-flag-stripe h-1 w-full shrink-0" />
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="flex items-center justify-between gap-2 border-b border-zindo-ink-100 p-4">
            <div className="flex min-w-0 items-center gap-3">
              <ZindoLogo size={36} />
              <div className="min-w-0">
                <p className="truncate text-sm font-extrabold text-zindo-ink-900">ZINDO</p>
                <span className="inline-block max-w-full truncate rounded-full bg-zindo-green-500/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-zindo-green-400">
                  {businessName}
                </span>
              </div>
            </div>
            <button onClick={onClose} className="shrink-0 rounded-lg p-2 text-zindo-ink-500 hover:bg-zindo-ink-50 hover:text-zindo-ink-900">
              <X className="h-5 w-5" />
            </button>
          </div>
          <nav className="space-y-1 p-3">
            {mainItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = NAV_ICONS[item.icon];
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-gradient-to-r from-zindo-green-600 to-zindo-green-500 text-white shadow-md shadow-zindo-green-800/25"
                      : "text-zindo-ink-500 hover:bg-zindo-ink-50 hover:text-zindo-ink-900"
                  )}
                >
                  <span className="flex items-center gap-3">
                    <span
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                        ICON_BADGE_COLORS[item.icon]
                      )}
                    >
                      <Icon className="h-4.5 w-4.5 text-white" />
                    </span>
                    {item.label}
                  </span>
                  {item.badge && (
                    <span
                      className={cn(
                        "rounded-md px-1.5 py-0.5 text-[10px] font-bold",
                        active ? "bg-white/20 text-white" : "bg-zindo-gold-500/20 text-zindo-gold-400"
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {footerItems.length > 0 && (
          <div className="space-y-1 border-t border-zindo-ink-100 bg-zindo-ink-50/60 p-3">
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
                  "flex items-center rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors",
                  pathname === item.href
                    ? "bg-gradient-to-r from-zindo-green-600 to-zindo-green-500 text-white shadow-md shadow-zindo-green-800/25"
                    : "text-zindo-ink-500 hover:bg-zindo-ink-50 hover:text-zindo-ink-900"
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
