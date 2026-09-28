import Link from "next/link";
import { notFound } from "next/navigation";
import { Home, LayoutGrid, Search, Store } from "lucide-react";
import { canViewMarket } from "@/lib/market-data";

export const metadata = {
  title: "Marché ZINDO",
  description: "Découvrez les produits des commerçants ZINDO près de chez vous.",
};

/** Habillage public du nouveau Marché (flag nouveau_marche). */
export default async function MarketLayout({ children }: { children: React.ReactNode }) {
  if (!(await canViewMarket())) notFound();

  return (
    <div className="theme-locked min-h-screen bg-zinc-50 pb-20 md:pb-0">
      <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5">
          <Link href="/marche" className="shrink-0 text-lg font-extrabold text-zindo-green-700">
            ZINDO <span className="font-semibold text-zinc-500">Marché</span>
          </Link>
          <form action="/marche" className="relative min-w-0 flex-1 md:mx-auto md:max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              name="q"
              placeholder="Rechercher un produit, une marque…"
              className="h-10 w-full rounded-full border border-zinc-300 bg-zinc-50 pl-9 pr-3 text-sm focus:border-zindo-green-500 focus:bg-white focus:outline-none"
            />
          </form>
          <nav className="hidden items-center gap-4 text-sm font-medium text-zinc-600 md:flex">
            <Link href="/marche/categories" className="hover:text-zindo-green-700">Catégories</Link>
            <Link href="/marche/boutiques" className="hover:text-zindo-green-700">Boutiques</Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-4">{children}</main>

      {/* Navigation du bas sur téléphone ; le panier, les commandes et le compte arrivent à l'étape 2. */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 border-t border-zinc-200 bg-white md:hidden">
        {[
          { href: "/marche", label: "Accueil", icon: Home },
          { href: "/marche/categories", label: "Catégories", icon: LayoutGrid },
          { href: "/marche/boutiques", label: "Boutiques", icon: Store },
        ].map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className="flex flex-col items-center gap-0.5 py-2 text-xs font-medium text-zinc-600">
            <Icon className="h-5 w-5" />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
