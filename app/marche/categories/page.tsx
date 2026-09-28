import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { MARKET_CATEGORIES } from "@/lib/market";
import { CategoryIcon } from "@/components/market/CategoryIcon";

export default function MarketCategoriesPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-zinc-900">Toutes les catégories</h1>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {MARKET_CATEGORIES.map((c) => (
          <Link
            key={c.key}
            href={`/marche/recherche?categorie=${c.key}`}
            className="flex items-center gap-4 rounded-2xl bg-white p-4 ring-1 ring-zinc-200 transition hover:shadow-md"
          >
            <CategoryIcon category={c.key} size={48} />
            <span className="flex-1 font-semibold text-zinc-800">{c.label}</span>
            <ChevronRight className="h-5 w-5 text-zinc-400" />
          </Link>
        ))}
      </div>
    </div>
  );
}
