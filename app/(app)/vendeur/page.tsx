import Link from "next/link";
import { redirect } from "next/navigation";
import { BadgeCheck, ExternalLink, Package, Plus, ShoppingBag } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { isMarketSeller } from "@/lib/market-seller";

/** Accueil de l'espace vendeur du Marché (vendeurs sans boutique, voir lib/market-seller.ts). */
export default async function MarketSellerHomePage() {
  const user = await requireUser();
  if (!(await isMarketSeller(user.businessId))) redirect("/dashboard");

  const { data: store } = await supabase
    .from("online_stores")
    .select("id, slug")
    .eq("business_id", user.businessId)
    .maybeSingle();

  const [{ count: productCount }, { count: pendingOrders }] = await Promise.all([
    supabase.from("products").select("id", { count: "exact", head: true }).eq("business_id", user.businessId).eq("active", true),
    store
      ? supabase.from("online_orders").select("id", { count: "exact", head: true }).eq("store_id", store.id).eq("status", "EN_ATTENTE")
      : Promise.resolve({ count: 0 }),
  ]);

  const tiles = [
    { href: "/produits", label: "Produits en vente", value: productCount ?? 0, icon: Package },
    { href: "/boutique-en-ligne/commandes", label: "Commandes à traiter", value: pendingOrders ?? 0, icon: ShoppingBag },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-zindo-ink-900">Bonjour {user.firstName} 👋</h1>
        <p className="text-sm text-zinc-600">Votre espace vendeur du Marché ZINDO.</p>
      </div>

      <Link
        href="/produits/nouveau"
        className="flex items-center justify-center gap-2 rounded-2xl bg-zindo-green-500 py-4 text-base font-bold text-white shadow-md hover:bg-zindo-green-600"
      >
        <Plus className="h-5 w-5" /> Mettre un produit en vente
      </Link>

      <div className="grid grid-cols-2 gap-3">
        {tiles.map((t) => (
          <Link key={t.href} href={t.href} className="rounded-2xl border border-zinc-200 bg-white p-4 hover:shadow-sm">
            <t.icon className="h-5 w-5 text-zindo-green-600" />
            <p className="mt-2 text-2xl font-extrabold text-zindo-ink-900">{t.value}</p>
            <p className="text-xs text-zinc-500">{t.label}</p>
          </Link>
        ))}
      </div>

      {store && (
        <Link
          href={`/boutique/${store.slug}`}
          target="_blank"
          className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white p-4 text-sm hover:shadow-sm"
        >
          <span>
            <strong>Ma page vendeur</strong>
            <span className="block text-xs text-zinc-500">Partagez ce lien sur WhatsApp et Facebook</span>
          </span>
          <ExternalLink className="h-4 w-4 text-zinc-400" />
        </Link>
      )}

      <Link
        href="/verification"
        className="flex items-center gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-800 hover:bg-sky-100"
      >
        <BadgeCheck className="h-6 w-6 shrink-0 text-sky-600" />
        <span>
          <strong>Pack Vérifié : 1 000 FCFA / mois</strong>
          <span className="block text-xs">Badge « Vérifié » et vos produits à la une du marché.</span>
        </span>
      </Link>
    </div>
  );
}
