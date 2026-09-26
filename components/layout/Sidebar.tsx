import Link from "next/link";
import { ChevronsUpDown } from "lucide-react";
import type { NavItem } from "@/lib/nav";
import { SidebarLink } from "./SidebarLink";
import { SidebarNav } from "./SidebarNav";
import { SidebarCloseButton } from "./SidebarToggle";
import { groupNavItems } from "./nav-icons";
import { ZindoLogo } from "@/components/auth/ZindoLogo";

export function Sidebar({
  businessName,
  items,
  userName,
  menuSearch = false,
}: {
  businessName: string;
  items: NavItem[];
  userName: string;
  /** Champ « Chercher un module » en haut du menu (flag « recherche_menu »). */
  menuSearch?: boolean;
}) {
  const footerHrefs = ["/support", "/parametres"];
  const footerItems = footerHrefs
    .map((href) => items.find((item) => item.href === href))
    .filter((item): item is NavItem => Boolean(item));
  const groups = groupNavItems(items.filter((item) => !footerHrefs.includes(item.href)));

  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-zinc-200 bg-white md:flex dark:border-slate-800 dark:bg-slate-900">
      <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-zinc-200 px-4 dark:border-slate-800">
        <ZindoLogo size={30} className="!rounded-lg !shadow-none" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold leading-tight text-zinc-900">ZINDO</p>
          <p className="truncate text-xs text-zinc-500" title={businessName}>
            {businessName}
          </p>
        </div>
        <SidebarCloseButton className="-mr-1.5 shrink-0 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-slate-800" />
      </div>

      <SidebarNav groups={groups} footerItems={footerItems} searchable={menuSearch} />

      {footerItems.length > 0 && (
        <div className="shrink-0 space-y-px border-t border-zinc-200 px-3 py-2 dark:border-slate-800">
          {footerItems.map((item) => (
            <SidebarLink key={item.href} item={item} />
          ))}
        </div>
      )}

      <Link
        href="/profil"
        className="flex shrink-0 items-center gap-2.5 border-t border-zinc-200 px-4 py-3 transition-colors hover:bg-zinc-50 dark:border-slate-800 dark:hover:bg-slate-800/60"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white dark:bg-slate-700">
          {userName.slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-zinc-900">{userName}</p>
          <p className="text-xs text-zinc-500">Mon compte</p>
        </div>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-zinc-400" />
      </Link>
    </aside>
  );
}
