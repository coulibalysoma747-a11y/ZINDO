"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import type { NavItem } from "@/lib/nav";
import { ZindoLogo } from "@/components/auth/ZindoLogo";

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
      <div className="absolute left-0 top-0 flex h-full w-72 flex-col justify-between bg-slate-900 text-slate-300 shadow-xl">
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 p-4">
            <div className="flex min-w-0 items-center gap-3">
              <ZindoLogo size={36} />
              <div className="min-w-0">
                <p className="truncate text-sm font-extrabold text-white">ZINDO</p>
                <span className="inline-block max-w-full truncate rounded-full bg-zindo-green-500/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-zindo-green-400">
                  {businessName}
                </span>
              </div>
            </div>
            <button onClick={onClose} className="shrink-0 rounded-lg p-2 text-slate-400 hover:bg-slate-800/60 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>
          <nav className="space-y-1 p-3">
            {mainItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-gradient-to-r from-zindo-green-600 to-zindo-green-500 text-white shadow-md shadow-zindo-green-800/25"
                      : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-100"
                  )}
                >
                  {item.label}
                  {item.badge && (
                    <span
                      className={cn(
                        "rounded-md px-1.5 py-0.5 text-[10px] font-bold",
                        active ? "bg-white/20 text-white" : "bg-zindo-green-500/20 text-zindo-green-400"
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
          <div className="space-y-1 border-t border-slate-800/80 bg-slate-950/40 p-3">
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
                    : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-100"
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
