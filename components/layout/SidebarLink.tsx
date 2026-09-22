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
      className={cn(
        "group flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200",
        active
          ? "bg-gradient-to-r from-zindo-green-600 to-zindo-green-500 text-white shadow-md shadow-zindo-green-800/25"
          : "text-zindo-ink-500 hover:bg-zindo-ink-50 hover:text-zindo-ink-900"
      )}
    >
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-110",
            ICON_BADGE_COLORS[item.icon]
          )}
        >
          <Icon className="h-4.5 w-4.5 text-white" />
        </span>
        <span>{item.label}</span>
      </div>
      {item.badge && (
        <span
          className={cn(
            "rounded-md px-1.5 py-0.5 text-[10px] font-bold transition-colors",
            active
              ? "bg-white/20 text-white"
              : "bg-zindo-gold-500/20 text-zindo-gold-400 group-hover:bg-zindo-gold-500 group-hover:text-white"
          )}
        >
          {item.badge}
        </span>
      )}
    </Link>
  );
}
