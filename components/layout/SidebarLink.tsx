"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import type { NavItem } from "@/lib/nav";
import { NAV_ICONS } from "./nav-icons";

// Menu en couleur (barre sombre, flag interface_pro) : chaque module a sa pastille,
// couleur stable tirée de son adresse. Vert, or et rouge de ZINDO en premier.
const TILE_COLORS = [
  "group-data-[colored]/side:bg-[#10844a]",
  "group-data-[colored]/side:bg-[#c98a0b]",
  "group-data-[colored]/side:bg-[#c8322b]",
  "group-data-[colored]/side:bg-[#0f7c86]",
  "group-data-[colored]/side:bg-[#3b5bdb]",
  "group-data-[colored]/side:bg-[#7c3aed]",
  "group-data-[colored]/side:bg-[#b4531f]",
  "group-data-[colored]/side:bg-[#0e7490]",
];
function tileColor(href: string) {
  let h = 0;
  for (const ch of href) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return TILE_COLORS[h % TILE_COLORS.length];
}

export function SidebarLink({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const bases = ([] as string[]).concat(item.activeMatch ?? item.href);
  const active = bases.some((base) => pathname === base || pathname.startsWith(`${base}/`));
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
      // Pas de préchargement : le menu compte ~30 modules, les télécharger tous à
      // chaque page ralentit l'application et consomme le forfait des commerçants.
      prefetch={false}
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex items-center justify-between gap-2 rounded-lg px-2.5 py-[7px] text-[13.5px] transition-colors duration-100",
        active
          ? "bg-zindo-green-50 font-semibold text-zindo-green-800 dark:bg-zindo-green-500/10 dark:text-zindo-green-300"
          : "font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
      )}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          className={cn(
            "flex shrink-0 items-center justify-center rounded-md group-data-[colored]/side:h-7 group-data-[colored]/side:w-7 group-data-[colored]/side:text-white",
            tileColor(item.href)
          )}
        >
          <Icon
            className={cn(
              "h-[17px] w-[17px] shrink-0 group-data-[colored]/side:!h-[15px] group-data-[colored]/side:!w-[15px] group-data-[colored]/side:!text-white",
              active ? "text-zindo-green-600 dark:text-zindo-green-400" : "text-zinc-400 group-hover:text-zinc-600 dark:text-slate-500"
            )}
          />
        </span>
        <span className="truncate">{item.label}</span>
      </div>
      {item.badge && (
        <span className="shrink-0 rounded border border-zinc-200 px-1 text-[10px] font-semibold text-zinc-500 dark:border-slate-700 dark:text-slate-400">
          {item.badge}
        </span>
      )}
    </Link>
  );
}
