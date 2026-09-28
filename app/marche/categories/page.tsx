import Link from "next/link";
import { MARKET_CATEGORIES } from "@/lib/market";

export default function MarketCategoriesPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-zinc-900">Toutes les catégories</h1>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {MARKET_CATEGORIES.map((c) => (
          <Link
            key={c.key}
            href={`/marche?categorie=${c.key}`}
            className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-4 font-medium text-zinc-800 hover:shadow-sm"
          >
            <span className="text-2xl">{c.emoji}</span>
            {c.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
