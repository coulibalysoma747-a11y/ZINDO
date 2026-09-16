import Link from "next/link";
import { cn } from "@/lib/cn";

const TABS = [
  { key: "produits", href: "/produits", label: "Produits" },
  { key: "categories", href: "/categories", label: "Catégories" },
  { key: "marques", href: "/marques", label: "Marques" },
] as const;

/** Navigation partagée entre Produits, Catégories et Marques — même pattern que OnlineStoreTabs. */
export function CatalogTabs({ active }: { active: "produits" | "categories" | "marques" }) {
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
