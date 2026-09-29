import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ClipboardList, Heart, Home, LayoutGrid, MessageSquare, ShoppingCart, User } from "lucide-react";
import { canViewMarket } from "@/lib/market-data";
import { getCurrentBuyer } from "@/lib/market-buyer";
import { countUnread } from "@/lib/market-messages";
import { CartCount } from "@/components/market/cart-store";
import { MarketSearchBox } from "@/components/market/MarketSearchBox";

export const metadata = {
  title: "Marché ZINDO",
  description: "Découvrez les produits et boutiques proposés par les commerçants sur ZINDO.",
  manifest: "/manifest-marche.json",
};

const BOTTOM_NAV = [
  { href: "/marche", label: "Accueil", icon: Home },
  { href: "/marche/categories", label: "Catégories", icon: LayoutGrid },
  { href: "/marche/panier", label: "Panier", icon: ShoppingCart, cart: true },
  { href: "/marche/commandes", label: "Commandes", icon: ClipboardList },
  { href: "/marche/compte", label: "Compte", icon: User },
];

const iconLink = "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-zinc-700 hover:bg-zinc-100 hover:text-zindo-green-700";

/** Habillage public du nouveau Marché (flag nouveau_marche). */
export default async function MarketLayout({ children }: { children: React.ReactNode }) {
  const [open, buyer] = await Promise.all([canViewMarket(), getCurrentBuyer()]);
  if (!open) notFound();
  const unread = buyer ? await countUnread({ buyerId: buyer.id }) : 0;

  const messages = buyer && (
    <Link href="/marche/messages" aria-label="Messages" className={iconLink}>
      <MessageSquare className="h-[22px] w-[22px]" />
      {unread > 0 && <span className="absolute right-0.5 top-0.5 min-w-4 rounded-full bg-red-600 px-1 text-center text-[10px] font-bold leading-4 text-white">{unread > 99 ? "99+" : unread}</span>}
    </Link>
  );
  const cart = (
    <Link href="/marche/panier" aria-label="Panier" className={iconLink}>
      <ShoppingCart className="h-[22px] w-[22px]" />
      <CartCount />
    </Link>
  );
  const search = (
    <Suspense fallback={<div className="h-11 w-full rounded-xl border border-zinc-300 bg-white" />}>
      <MarketSearchBox />
    </Suspense>
  );

  return (
    <div className="theme-locked min-h-screen bg-zinc-50 pb-20 md:pb-0">
      <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4">
          {/* Ligne 1 : logo, recherche (ordinateur), liens et icônes. */}
          <div className="flex h-14 items-center gap-3 md:h-16 md:gap-6">
            <Link href="/marche" className="flex shrink-0 items-baseline gap-1.5">
              <span className="text-xl font-extrabold tracking-tight text-zindo-green-700">ZINDO</span>
              <span className="text-sm font-semibold text-zinc-500">Marché</span>
            </Link>
            <div className="hidden min-w-0 max-w-2xl flex-1 md:block">{search}</div>
            <nav className="ml-auto flex items-center gap-1">
              <Link href="/marche/categories" className="hidden rounded-xl px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 lg:block">
                Catégories
              </Link>
              <Link href="/marche/boutiques" className="hidden rounded-xl px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 lg:block">
                Boutiques
              </Link>
              <Link href="/marche/commandes" className="hidden rounded-xl px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 lg:block">
                Commandes
              </Link>
              <Link href="/marche/favoris" aria-label="Mes favoris" className={`${iconLink} hidden md:flex`}>
                <Heart className="h-[22px] w-[22px]" />
              </Link>
              {messages}
              <Link href="/marche/compte" aria-label="Mon compte" className={`${iconLink} hidden md:flex`}>
                <User className="h-[22px] w-[22px]" />
              </Link>
              <InstallAppButton
                iconOnly
                label="Installer le Marché"
                appName="le Marché ZINDO"
                className="flex shrink-0 items-center gap-1.5 rounded-xl bg-zindo-green-600 px-3 py-2 text-xs font-semibold text-white hover:bg-zindo-green-700"
              />
              {cart}
            </nav>
          </div>
          {/* Ligne 2 (téléphone et tablette) : recherche en pleine largeur. */}
          <div className="pb-3 md:hidden">{search}</div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-4">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-zinc-200 bg-white md:hidden">
        {BOTTOM_NAV.map(({ href, label, icon: Icon, cart: isCart }) => (
          <Link key={href} href={href} className="flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-zinc-600">
            <span className="relative">
              <Icon className="h-5 w-5" />
              {isCart && <CartCount />}
            </span>
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
