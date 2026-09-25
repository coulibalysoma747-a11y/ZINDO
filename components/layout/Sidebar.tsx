import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { NavItem } from "@/lib/nav";
import { SidebarLink } from "./SidebarLink";
import { SidebarCloseButton } from "./SidebarToggle";
import { ZindoLogo } from "@/components/auth/ZindoLogo";

export function Sidebar({
  businessName,
  items,
  userName,
}: {
  businessName: string;
  items: NavItem[];
  userName: string;
}) {
  const footerHrefs = ["/support", "/parametres"];
  const footerItems = footerHrefs
    .map((href) => items.find((item) => item.href === href))
    .filter((item): item is NavItem => Boolean(item));
  const mainItems = items.filter((item) => !footerHrefs.includes(item.href));

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-zinc-200/80 bg-white text-zindo-ink-700 md:flex dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
      <div className="zindo-flag-stripe h-1 w-full shrink-0" />
      <div className="flex shrink-0 items-center gap-3 px-4 pb-3 pt-4">
        <ZindoLogo size={38} className="!rounded-xl !shadow-md" />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-extrabold leading-tight tracking-wide text-zindo-ink-900 dark:text-white">ZINDO</p>
          <p className="truncate text-xs font-medium text-zinc-500" title={businessName}>
            {businessName}
          </p>
        </div>
        <SidebarCloseButton className="-mr-1 shrink-0 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white" />
      </div>

      <div className="mx-4 h-px shrink-0 bg-zinc-100 dark:bg-slate-800" />

      <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-3 py-3">
        {mainItems.map((item) => (
          <SidebarLink key={item.href} item={item} />
        ))}
      </nav>

      {footerItems.length > 0 && (
        <div className="shrink-0 space-y-0.5 border-t border-zinc-100 px-3 py-2 dark:border-slate-800">
          {footerItems.map((item) => (
            <SidebarLink key={item.href} item={item} />
          ))}
        </div>
      )}

      <div className="shrink-0 p-3 pt-0">
        <Link
          href="/profil"
          className="group flex items-center gap-3 rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-2.5 transition-colors hover:border-zindo-green-200 hover:bg-zindo-green-50/60 dark:border-slate-800 dark:bg-slate-800/50 dark:hover:bg-slate-800"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-zindo-green-400 to-zindo-green-600 text-sm font-bold text-white shadow-sm">
            {userName.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-zindo-ink-900 dark:text-white">{userName}</p>
            <p className="text-[11px] text-zinc-500">Mon compte</p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-zinc-300 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </aside>
  );
}
