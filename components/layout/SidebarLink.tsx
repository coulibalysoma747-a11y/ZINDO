"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import type { NavItem } from "@/lib/nav";
import { NAV_ICONS, ICON_BADGE_COLORS } from "./nav-icons";

export function SidebarLink({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
  const Icon = NAV_ICONS[item.icon];
  // Le lien Support transporte la page courante avec lui : c'est le seul
  // moyen pour /support de savoir sur quel écran l'utilisateur se trouvait
  // réellement, puisque son propre usePathname() ne renverrait que "/support".
  const href =
    item.href === "/support" && pathname !== "/support"
      ? `/support?from=${encodeURIComponent(pathname)}`
      : item.href;

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex items-center justify-between rounded-xl px-2.5 py-2 text-sm transition-colors duration-150",
        active
          ? "bg-zindo-green-50 font-semibold text-zindo-green-800 dark:bg-zindo-green-500/10 dark:text-zindo-green-300"
          : "font-medium text-zindo-ink-500 hover:bg-zinc-100/80 hover:text-zindo-ink-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
      )}
    >
      {active && <span className="absolute -left-3 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-zindo-green-500" />}
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg shadow-sm transition-transform duration-200 group-hover:scale-105",
            ICON_BADGE_COLORS[item.icon]
          )}
        >
          <Icon className="h-4 w-4 text-white" />
        </span>
        <span className="truncate">{item.label}</span>
      </div>
      {item.badge && (
        <span
          className={cn(
            "ml-2 shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold",
            active ? "bg-zindo-green-500 text-white" : "bg-zindo-gold-100 text-zindo-gold-700 dark:bg-zindo-gold-500/15 dark:text-zindo-gold-300"
          )}
        >
          {item.badge}
        </span>
      )}
    </Link>
  );
}
