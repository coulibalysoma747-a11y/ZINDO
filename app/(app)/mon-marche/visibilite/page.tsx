import { Flame, Store, Wallet } from "lucide-react";
import { PERMISSIONS } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { formatDateTime, formatMoney } from "@/lib/format";
import { requireMarketSeller } from "@/lib/market-seller";
import { PaymentMethodModules } from "../../abonnement/PaymentMethodModules";
import { MarketSellerNav } from "../MarketSellerNav";
import { BoostForm, TopupForm } from "./WalletForms";

const TX_LABELS: Record<string, string> = {
  RECHARGE: "Recharge",
  BOOST_PRODUIT: "Produit mis en avant",
  BOOST_BOUTIQUE: "Boutique mise en avant",
  AJUSTEMENT: "Ajustement",
};

/** Visibilité : portefeuille ZINDO et mises en avant payantes (Mon Marché). */
export default async function MyMarketVisibilityPage() {
  const { user, shop, newOrders } = await requireMarketSeller(PERMISSIONS.SETTINGS_MANAGE);
  const now = new Date().toISOString();

  const [{ data: wallet }, { data: topupData }, { data: txData }, { data: priceData }, { data: listingData }, { data: boostData }] = await Promise.all([
    supabase.from("market_wallets").select("balance").eq("business_id", user.businessId).maybeSingle(),
    supabase.from("market_topups").select("id, amount, operator, reference, status, rejectReason:reject_reason, submittedAt:submitted_at").eq("business_id", user.businessId).order("submitted_at", { ascending: false }).limit(10),
    supabase.from("market_wallet_transactions").select("id, kind, amount, balanceAfter:balance_after, details, createdAt:created_at").eq("business_id", user.businessId).order("created_at", { ascending: false }).limit(30),
    supabase.from("market_boost_prices").select("kind, days, price").eq("active", true).order("days"),
    supabase
      .from("market_listings")
      .select("id, product:products!inner(name, photoUrl:photo_url)")
      .eq("business_id", user.businessId)
      .eq("published", true)
      .eq("removed_by_admin", false)
      .gt("product.photo_url", ""),
    supabase
      .from("market_boosts")
      .select("id, kind, endsAt:ends_at, startsAt:starts_at, listing:market_listings(product:products(name))")
      .eq("business_id", user.businessId)
      .gt("ends_at", now)
      .order("ends_at"),
  ]);
  const balance = (wallet?.balance as number | undefined) ?? 0;
  const topups = (topupData ?? []) as { id: string; amount: number; operator: string; reference: string; status: string; rejectReason: string | null; submittedAt: string }[];
  const transactions = (txData ?? []) as { id: string; kind: string; amount: number; balanceAfter: number; details: string | null; createdAt: string }[];
  const prices = (priceData ?? []) as { kind: string; days: number; price: number }[];
  const listings = ((listingData ?? []) as unknown as { id: string; product: { name: string } }[]).map((l) => ({ id: l.id, label: l.product.name })).sort((a, b) => a.label.localeCompare(b.label));
  const boosts = (boostData ?? []) as unknown as { id: string; kind: string; endsAt: string; startsAt: string; listing: { product: { name: string } | null } | null }[];
  const pending = topups.filter((t) => t.status === "EN_ATTENTE");

  return (
    <div className="max-w-5xl space-y-6">
      <MarketSellerNav active="/mon-marche/visibilite" shop={shop} newOrders={newOrders} />

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <section className="space-y-2 rounded-2xl bg-zinc-900 p-5 text-white">
          <p className="flex items-center gap-2 text-sm text-white/70">
            <Wallet className="h-4 w-4" /> Portefeuille ZINDO
          </p>
          <p className="text-3xl font-extrabold">{formatMoney(balance)}</p>
          {pending.length > 0 && (
            <p className="text-xs text-amber-300">
              {pending.length} recharge{pending.length > 1 ? "s" : ""} en attente de vérification ({formatMoney(pending.reduce((s, t) => s + t.amount, 0))})
            </p>
          )}
          <p className="text-xs text-white/60">Payez vos mises en avant instantanément depuis ce solde.</p>
        </section>
        <section className="space-y-3 rounded-2xl bg-white p-5 ring-1 ring-zinc-200">
          <h2 className="font-semibold text-zinc-900">Recharger</h2>
          <p className="text-sm text-zinc-600">1. Envoyez le montant de votre choix sur un de ces numéros ZINDO :</p>
          <PaymentMethodModules />
          <p className="text-sm text-zinc-600">2. Déclarez votre transfert ci-dessous. Votre solde est crédité dès la vérification par ZINDO.</p>
          <TopupForm />
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="space-y-3 rounded-2xl bg-white p-5 ring-1 ring-zinc-200">
          <h2 className="flex items-center gap-2 font-semibold text-zinc-900">
            <Flame className="h-5 w-5 text-orange-500" /> Mettre un produit en avant
          </h2>
          <p className="text-sm text-zinc-500">Il apparaît dans « Produits mis en avant » en haut du Marché.</p>
          <BoostForm kind="PRODUIT" targets={listings} prices={prices.filter((p) => p.kind === "PRODUIT")} balance={balance} />
        </section>
        <section className="space-y-3 rounded-2xl bg-white p-5 ring-1 ring-zinc-200">
          <h2 className="flex items-center gap-2 font-semibold text-zinc-900">
            <Store className="h-5 w-5 text-zindo-green-700" /> Mettre ma boutique en avant
          </h2>
          <p className="text-sm text-zinc-500">Elle apparaît dans « Boutiques mises en avant » et en tête de la liste des boutiques.</p>
          <BoostForm
            kind="BOUTIQUE"
            targets={shop && shop.published && !shop.suspended ? [{ id: shop.id, label: shop.name }] : []}
            prices={prices.filter((p) => p.kind === "BOUTIQUE")}
            balance={balance}
          />
        </section>
      </div>

      <section className="rounded-2xl bg-white p-5 ring-1 ring-zinc-200">
        <h2 className="mb-3 font-semibold text-zinc-900">Mises en avant actives</h2>
        {boosts.length === 0 ? (
          <p className="text-sm text-zinc-500">Aucune mise en avant en cours.</p>
        ) : (
          <ul className="divide-y divide-zinc-100 text-sm">
            {boosts.map((b) => (
              <li key={b.id} className="flex flex-wrap justify-between gap-2 py-2">
                <span className="font-medium text-zinc-800">{b.kind === "BOUTIQUE" ? `🏪 ${shop?.name ?? "Ma boutique"}` : `🔥 ${b.listing?.product?.name ?? "Produit"}`}</span>
                <span className="text-zinc-500">
                  {new Date(b.startsAt) > new Date() ? `à partir du ${formatDateTime(b.startsAt)} · ` : ""}jusqu&apos;au {formatDateTime(b.endsAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl bg-white p-5 ring-1 ring-zinc-200">
          <h2 className="mb-3 font-semibold text-zinc-900">Mes recharges</h2>
          {topups.length === 0 ? (
            <p className="text-sm text-zinc-500">Aucune recharge.</p>
          ) : (
            <ul className="divide-y divide-zinc-100 text-sm">
              {topups.map((t) => (
                <li key={t.id} className="py-2">
                  <div className="flex justify-between gap-2">
                    <span className="font-medium">{formatMoney(t.amount)}</span>
                    <span className={t.status === "VALIDEE" ? "text-emerald-700" : t.status === "REFUSEE" ? "text-red-600" : "text-amber-700"}>
                      {t.status === "VALIDEE" ? "Créditée" : t.status === "REFUSEE" ? "Refusée" : "En vérification"}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500">
                    {t.operator === "ORANGE" ? "Orange Money" : "Moov Money"} · réf. {t.reference} · {formatDateTime(t.submittedAt)}
                  </p>
                  {t.rejectReason && <p className="text-xs text-red-600">Motif : {t.rejectReason}</p>}
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="rounded-2xl bg-white p-5 ring-1 ring-zinc-200">
          <h2 className="mb-3 font-semibold text-zinc-900">Historique du portefeuille</h2>
          {transactions.length === 0 ? (
            <p className="text-sm text-zinc-500">Aucun mouvement.</p>
          ) : (
            <ul className="divide-y divide-zinc-100 text-sm">
              {transactions.map((t) => (
                <li key={t.id} className="flex justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="font-medium text-zinc-800">{TX_LABELS[t.kind] ?? t.kind}</p>
                    <p className="truncate text-xs text-zinc-500">
                      {t.details} · {formatDateTime(t.createdAt)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={t.amount >= 0 ? "font-semibold text-emerald-700" : "font-semibold text-zinc-900"}>
                      {t.amount >= 0 ? "+" : ""}
                      {formatMoney(t.amount)}
                    </p>
                    <p className="text-xs text-zinc-400">solde {formatMoney(t.balanceAfter)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
