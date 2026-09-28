import Link from "next/link";
import { notFound } from "next/navigation";
import { ClipboardList, Home, LayoutGrid, Search, ShoppingCart, User } from "lucide-react";
import { canViewMarket } from "@/lib/market-data";
import { CartCount } from "@/components/market/cart-store";

export const metadata = {
  title: "Marché ZINDO",
  description: "Découvrez les produits et boutiques proposés par les commerçants sur ZINDO.",
};

const BOTTOM_NAV = [
  { href: "/marche", label: "Accueil", icon: Home },
  { href: "/marche/categories", label: "Catégories", icon: LayoutGrid },
  { href: "/marche/panier", label: "Panier", icon: ShoppingCart, cart: true },
  { href: "/marche/commandes", label: "Commandes", icon: ClipboardList },
  { href: "/marche/compte", label: "Compte", icon: User },
];

/** Habillage public du nouveau Marché (flag nouveau_marche). */
export default async function MarketLayout({ children }: { children: React.ReactNode }) {
  if (!(await canViewMarket())) notFound();

  return (
    <div className="theme-locked min-h-screen bg-zinc-50 pb-20 md:pb-0">
      <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5">
          <Link href="/marche" className="shrink-0 text-lg font-extrabold text-zindo-green-700">
            ZINDO <span className="hidden font-semibold text-zinc-500 sm:inline">Marché</span>
          </Link>
          <form action="/marche" className="relative min-w-0 flex-1 md:mx-auto md:max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              name="q"
              placeholder="Que recherchez-vous ?"
              className="h-10 w-full rounded-full border border-zinc-300 bg-zinc-50 pl-9 pr-3 text-sm focus:border-zindo-green-500 focus:bg-white focus:outline-none"
            />
          </form>
          <nav className="hidden items-center gap-4 text-sm font-medium text-zinc-600 md:flex">
            <Link href="/marche/categories" className="hover:text-zindo-green-700">Catégories</Link>
            <Link href="/marche/boutiques" className="hover:text-zindo-green-700">Boutiques</Link>
            <Link href="/marche/commandes" className="hover:text-zindo-green-700">Commandes</Link>
            <Link href="/marche/compte" aria-label="Mon compte" className="hover:text-zindo-green-700">
              <User className="h-5 w-5" />
            </Link>
          </nav>
          <Link href="/marche/panier" aria-label="Panier" className="relative shrink-0 text-zinc-700 hover:text-zindo-green-700">
            <ShoppingCart className="h-6 w-6" />
            <CartCount />
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-4">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-zinc-200 bg-white md:hidden">
        {BOTTOM_NAV.map(({ href, label, icon: Icon, cart }) => (
          <Link key={href} href={href} className="flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-zinc-600">
            <span className="relative">
              <Icon className="h-5 w-5" />
              {cart && <CartCount />}
            </span>
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
