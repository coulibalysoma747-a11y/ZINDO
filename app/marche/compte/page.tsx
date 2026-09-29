import { Building2, ClipboardList, Heart, MessageSquare, ShoppingCart, Store } from "lucide-react";
import Link from "next/link";
import { getCurrentBuyer } from "@/lib/market-buyer";
import { logoutBuyerAction } from "@/lib/actions/market-buyer";
import { BuyerAuthForms } from "./BuyerAuthForms";
import { BuyerProfileForm } from "./BuyerProfileForm";

export const dynamic = "force-dynamic";

export default async function MarketAccountPage({ searchParams }: { searchParams: Promise<{ mode?: string; suite?: string }> }) {
  const { mode, suite } = await searchParams;
  const buyer = await getCurrentBuyer();

  if (!buyer) {
    return (
      <div className="mx-auto max-w-md">
        <BuyerAuthForms initialMode={mode === "inscription" ? "signup" : "login"} suite={suite ?? ""} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      <div className="rounded-2xl bg-white p-5 ring-1 ring-zinc-200">
        <p className="text-lg font-bold text-zinc-900">{buyer.name}</p>
        <p className="text-sm text-zinc-500">{buyer.phone}</p>
        {buyer.kind === "PRO" && <p className="mt-1 flex items-center gap-1.5 text-sm text-zinc-700"><Building2 className="h-4 w-4" /> {buyer.companyName}</p>}
      </div>
      <div className="divide-y divide-zinc-100 rounded-2xl bg-white ring-1 ring-zinc-200">
        <Link href="/marche/commandes" className="flex items-center gap-3 px-5 py-3 text-sm font-medium text-zinc-800 hover:bg-zinc-50">
          <ClipboardList className="h-5 w-5 text-zinc-500" /> Mes commandes
        </Link>
        <Link href="/marche/messages" className="flex items-center gap-3 px-5 py-3 text-sm font-medium text-zinc-800 hover:bg-zinc-50">
          <MessageSquare className="h-5 w-5 text-zinc-500" /> Mes messages
        </Link>
        <Link href="/marche/favoris" className="flex items-center gap-3 px-5 py-3 text-sm font-medium text-zinc-800 hover:bg-zinc-50">
          <Heart className="h-5 w-5 text-zinc-500" /> Mes favoris et boutiques suivies
        </Link>
        <Link href="/marche/panier" className="flex items-center gap-3 px-5 py-3 text-sm font-medium text-zinc-800 hover:bg-zinc-50">
          <ShoppingCart className="h-5 w-5 text-zinc-500" /> Mon panier
        </Link>
        <Link href="/inscription" className="flex items-center gap-3 px-5 py-3 text-sm font-medium text-zinc-800 hover:bg-zinc-50">
          <Store className="h-5 w-5 text-zinc-500" /> Vendre sur le Marché (créer mon commerce ZINDO)
        </Link>
      </div>
      <BuyerProfileForm buyer={buyer} />
      <form action={logoutBuyerAction}>
        <button className="w-full rounded-xl border border-zinc-300 bg-white py-2.5 text-sm font-semibold text-red-600">Se déconnecter</button>
      </form>
    </div>
  );
}
