import Link from "next/link";
import { cn } from "@/lib/cn";

const TABS = [
  { key: "produits", href: "/produits", label: "Produits" },
  { key: "categories", href: "/categories", label: "Catégories" },
  { key: "marques", href: "/marques", label: "Marques" },
] as const;

/** Navigation partagée entre Produits, Catégories et Marques — même pattern que OnlineStoreTabs. */
export function CatalogTabs({ active, pro = false }: { active: "produits" | "categories" | "marques"; pro?: boolean }) {
  if (pro) {
    return (
      <div className="flex gap-6 border-b border-zinc-200 dark:border-slate-800">
        {TABS.map((tab) => (
          <Link
            key={tab.key}
            href={tab.href}
            className={cn(
              "-mb-px border-b-2 pb-2.5 text-sm font-medium transition-colors",
              tab.key === active ? "border-[#0f7a4a] text-[#0f7a4a]" : "border-transparent text-zinc-500 hover:text-zinc-800"
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>
    );
  }
  return (
    <div className="flex flex-wrap gap-1 rounded-lg border border-zinc-200 bg-white p-1">
      {TABS.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            tab.key === active ? "bg-zindo-green-600 text-white" : "text-zinc-600 hover:bg-zinc-100"
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
