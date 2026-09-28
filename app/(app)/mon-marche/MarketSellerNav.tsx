import Link from "next/link";
import { ExternalLink, Store } from "lucide-react";

const TABS = [
  { href: "/mon-marche", label: "Tableau de bord" },
  { href: "/mon-marche/produits", label: "Produits" },
  { href: "/mon-marche/commandes", label: "Commandes" },
  { href: "/mon-marche/clients", label: "Clients" },
  { href: "/mon-marche/avis", label: "Avis" },
  { href: "/mon-marche/visibilite", label: "Visibilité" },
  { href: "/mon-marche/boutique", label: "Ma boutique" },
];

/** En-tête et onglets de l'espace vendeur « Mon Marché ». */
export function MarketSellerNav({
  active,
  shop,
  newOrders,
}: {
  active: string;
  shop: { slug: string; published: boolean; suspended: boolean; suspendedReason: string | null } | null;
  newOrders: number;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-zindo-green-600 text-white">
            <Store className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-bold text-zinc-900">Mon Marché</h1>
            <p className="text-xs text-zinc-500">Votre boutique sur le Marché ZINDO, reliée à votre stock</p>
          </div>
        </div>
        {shop?.published && !shop.suspended && (
          <Link href={`/marche/boutique/${shop.slug}`} target="_blank" className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50">
            Voir ma boutique en ligne <ExternalLink className="h-4 w-4" />
          </Link>
        )}
      </div>
      {shop?.suspended && (
        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-800 ring-1 ring-red-200">
          ⛔ Votre boutique a été suspendue par ZINDO{shop.suspendedReason ? ` : ${shop.suspendedReason}` : ""}. Contactez-nous au 04 05 99 29.
        </p>
      )}
      {shop && !shop.published && !shop.suspended && (
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">
          Votre boutique est masquée : les clients ne la voient pas.{" "}
          <Link href="/mon-marche/boutique" className="font-semibold underline">
            La rendre visible
          </Link>
        </p>
      )}
      <nav className="-mx-1 flex gap-1 overflow-x-auto border-b border-zinc-200">
        {TABS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={
              active === t.href
                ? "shrink-0 border-b-2 border-zindo-green-600 px-3 py-2.5 text-sm font-semibold text-zindo-green-800"
                : "shrink-0 border-b-2 border-transparent px-3 py-2.5 text-sm font-medium text-zinc-500 hover:text-zinc-800"
            }
          >
            {t.label}
            {t.href === "/mon-marche/commandes" && newOrders > 0 && (
              <span className="ml-1.5 rounded-full bg-red-600 px-1.5 py-0.5 text-[11px] font-bold text-white">{newOrders}</span>
            )}
          </Link>
        ))}
      </nav>
    </div>
  );
}
