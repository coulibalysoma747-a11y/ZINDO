import Link from "next/link";
import { BadgeCheck, Home, LogOut, Package, ShoppingBag, Store } from "lucide-react";
import { logoutAction } from "@/lib/actions/auth";
import { ZindoLogo } from "@/components/auth/ZindoLogo";

const LINKS = [
  { href: "/vendeur", label: "Accueil", icon: Home },
  { href: "/produits", label: "Mes produits", icon: Package },
  { href: "/boutique-en-ligne/commandes", label: "Mes commandes", icon: ShoppingBag },
  { href: "/verification", label: "Pack Vérifié", icon: BadgeCheck },
];

/** Cadre de l'espace vendeur du Marché (voir lib/market-seller.ts) : à la place du menu complet de l'application. */
export function MarketSellerShell({ sellerName, children }: { sellerName: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-50 pb-20 sm:pb-0">
      <header className="bg-zindo-ink-900 text-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/vendeur" className="flex min-w-0 items-center gap-2">
            <ZindoLogo size={30} />
            <span className="truncate text-sm font-bold">{sellerName}</span>
          </Link>
          <div className="flex items-center gap-1">
            <Link href="/marche" className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-zinc-300 hover:text-white">
              <Store className="h-4 w-4" /> Voir le marché
            </Link>
            <form action={logoutAction}>
              <button type="submit" aria-label="Se déconnecter" className="rounded-lg p-1.5 text-zinc-300 hover:text-white">
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
        <nav className="mx-auto hidden max-w-4xl gap-1 px-4 pb-2 sm:flex">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-zinc-300 hover:bg-white/10 hover:text-white">
              <l.icon className="h-4 w-4" /> {l.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-4xl p-4">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-zinc-200 bg-white sm:hidden">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-zinc-600">
            <l.icon className="h-5 w-5" /> {l.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
