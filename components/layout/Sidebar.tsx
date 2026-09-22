import type { NavItem } from "@/lib/nav";
import { SidebarLink } from "./SidebarLink";
import { ZindoLogo } from "@/components/auth/ZindoLogo";

export function Sidebar({
  businessName,
  items,
}: {
  businessName: string;
  items: NavItem[];
}) {
  const footerHrefs = ["/support", "/parametres"];
  const footerItems = footerHrefs
    .map((href) => items.find((item) => item.href === href))
    .filter((item): item is NavItem => Boolean(item));
  const mainItems = items.filter((item) => !footerHrefs.includes(item.href));

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col justify-between border-r border-zindo-ink-100 bg-white text-zindo-ink-700 shadow-xl md:flex">
      <div className="zindo-flag-stripe h-1 w-full shrink-0" />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex items-center gap-3 border-b border-zindo-ink-100 p-5">
          <ZindoLogo size={40} />
          <div className="min-w-0">
            <h1 className="truncate text-lg font-extrabold tracking-wide text-zindo-ink-900">ZINDO</h1>
            <span className="inline-block max-w-full truncate rounded-full bg-zindo-green-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-zindo-green-400">
              {businessName}
            </span>
          </div>
        </div>

        <nav className="space-y-1 p-3">
          {mainItems.map((item) => (
            <SidebarLink key={item.href} item={item} />
          ))}
        </nav>
      </div>

      {footerItems.length > 0 && (
        <div className="space-y-1 border-t border-zindo-ink-100 bg-zindo-ink-50/60 p-3">
          {footerItems.map((item) => (
            <SidebarLink key={item.href} item={item} />
          ))}
        </div>
      )}
    </aside>
  );
}
