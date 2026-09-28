import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { requireSuperAdmin } from "@/lib/superadmin-auth";
import { supabase } from "@/lib/supabase";
import { formatDateTime, formatMoney } from "@/lib/format";
import { MARKET_REPORT_REASONS, marketOrderStatusLabel } from "@/lib/market";
import { OrderStatusBadge } from "@/components/market/OrderStatusBadge";
import { StarRow } from "@/components/market/Stars";
import { Pagination, readPage } from "@/components/market/Pagination";
import { AdminMarketButton } from "./AdminMarketButton";
import { PriceRow, TopupButtons } from "./WalletAdmin";

const ADMIN_PAGE_SIZE = 30;

const TABS = [
  { key: "vue", label: "Vue d'ensemble" },
  { key: "signalements", label: "Signalements" },
  { key: "recharges", label: "Recharges" },
  { key: "tarifs", label: "Tarifs" },
  { key: "boutiques", label: "Boutiques" },
  { key: "commandes", label: "Commandes" },
  { key: "avis", label: "Avis" },
  { key: "acheteurs", label: "Acheteurs" },
];

function daysAgoIso(days: number) {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

const reasonLabel =(key: string) => MARKET_REPORT_REASONS.find((r) => r.key === key)?.label ?? key;

/** Administration du Marché ZINDO (propriétaire et administrateurs). */
export default async function AdminMarketPage({ searchParams }: { searchParams: Promise<{ onglet?: string; page?: string }> }) {
  await requireSuperAdmin();
  const { onglet = "vue", page: pageParam } = await searchParams;
  const page = readPage(pageParam);
  const tab = TABS.some((t) => t.key === onglet) ? onglet : "vue";

  const count = (table: string) => supabase.from(table).select("*", { count: "exact", head: true });
  const [shops, listings, buyers, openReports, orders, pendingTopups] = await Promise.all([
    count("market_shops").eq("published", true).eq("suspended", false),
    count("market_listings").eq("published", true).eq("removed_by_admin", false),
    count("market_buyers"),
    count("market_reports").eq("status", "OUVERT"),
    supabase.from("market_orders").select("status, total, createdAt:created_at").gte("created_at", daysAgoIso(30)),
    count("market_topups").eq("status", "EN_ATTENTE"),
  ]);
  const orderRows = (orders.data ?? []) as { status: string; total: number }[];
  const delivered = orderRows.filter((o) => o.status === "LIVREE");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Marché ZINDO</h1>
        <p className="text-sm text-zinc-500">Boutiques, annonces, commandes, signalements et avis du Marché.</p>
      </div>
      <nav className="flex gap-1 overflow-x-auto border-b border-zinc-200">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/admin/marche?onglet=${t.key}`}
            className={
              tab === t.key
                ? "shrink-0 border-b-2 border-zindo-green-600 px-3 py-2.5 text-sm font-semibold text-zindo-green-800"
                : "shrink-0 border-b-2 border-transparent px-3 py-2.5 text-sm font-medium text-zinc-500 hover:text-zinc-800"
            }
          >
            {t.label}
            {t.key === "signalements" && (openReports.count ?? 0) > 0 && (
              <span className="ml-1.5 rounded-full bg-red-600 px-1.5 py-0.5 text-[11px] font-bold text-white">{openReports.count}</span>
            )}
            {t.key === "recharges" && (pendingTopups.count ?? 0) > 0 && (
              <span className="ml-1.5 rounded-full bg-amber-500 px-1.5 py-0.5 text-[11px] font-bold text-white">{pendingTopups.count}</span>
            )}
          </Link>
        ))}
      </nav>

      {tab === "vue" && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {[
            { label: "Boutiques en ligne", value: shops.count ?? 0 },
            { label: "Produits publiés", value: listings.count ?? 0 },
            { label: "Comptes acheteurs", value: buyers.count ?? 0 },
            { label: "Commandes (30 jours)", value: orderRows.filter((o) => o.status !== "ANNULEE").length },
            { label: "Ventes livrées (30 jours)", value: formatMoney(delivered.reduce((s, o) => s + Number(o.total), 0)) },
            { label: "Signalements ouverts", value: openReports.count ?? 0 },
          ].map((t) => (
            <div key={t.label} className="rounded-2xl bg-white p-4 ring-1 ring-zinc-200">
              <p className="text-xs font-medium text-zinc-500">{t.label}</p>
              <p className="mt-1 text-2xl font-extrabold text-zinc-900">{t.value}</p>
            </div>
          ))}
        </div>
      )}

      {tab === "signalements" && <ReportsTab page={page} />}
      {tab === "recharges" && <TopupsTab page={page} />}
      {tab === "tarifs" && <PricesTab />}
      {tab === "boutiques" && <ShopsTab page={page} />}
      {tab === "commandes" && <OrdersTab page={page} />}
      {tab === "avis" && <ReviewsTab page={page} />}
      {tab === "acheteurs" && <BuyersTab page={page} />}
    </div>
  );
}

async function ReportsTab({ page }: { page: number }) {
  const from = (page - 1) * ADMIN_PAGE_SIZE;
  const { data, count } = await supabase
    .from("market_reports")
    .select(
      "id, reason, details, status, createdAt:created_at, buyer:market_buyers(name, phone), " +
        "listing:market_listings(id, removedByAdmin:removed_by_admin, product:products(id, name)), shop:market_shops(id, name, slug, suspended)"
    , { count: "exact" })
    .order("status", { ascending: false })
    .order("created_at", { ascending: false })
    .range(from, from + ADMIN_PAGE_SIZE - 1);
  const reports = (data ?? []) as unknown as {
    id: string;
    reason: string;
    details: string | null;
    status: string;
    createdAt: string;
    buyer: { name: string; phone: string } | null;
    listing: { id: string; removedByAdmin: boolean; product: { id: string; name: string } | null } | null;
    shop: { id: string; name: string; slug: string; suspended: boolean } | null;
  }[];
  if (reports.length === 0) return <Empty text="Aucun signalement." />;
  return (
    <div className="space-y-3">
      <div className="space-y-3">
        {reports.map((r) => (
          <div key={r.id} className={`space-y-2 rounded-2xl bg-white p-4 ring-1 ${r.status === "OUVERT" ? "ring-red-200" : "ring-zinc-200 opacity-70"}`}>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">{reasonLabel(r.reason)}</span>
              {r.listing?.product && (
                <Link href={`/marche/produit/${r.listing.product.id}`} target="_blank" className="inline-flex items-center gap-1 font-semibold text-zinc-900 hover:underline">
                  Produit : {r.listing.product.name} <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              )}
              {r.shop && (
                <Link href={`/marche/boutique/${r.shop.slug}`} target="_blank" className="inline-flex items-center gap-1 font-semibold text-zinc-900 hover:underline">
                  Boutique : {r.shop.name} <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              )}
              <span className="text-xs text-zinc-500">
                {formatDateTime(r.createdAt)} · par {r.buyer?.name ?? "?"} ({r.buyer?.phone ?? "?"}) · {r.status === "OUVERT" ? "ouvert" : r.status === "TRAITE" ? "traité" : "rejeté"}
              </span>
            </div>
            {r.details && <p className="text-sm text-zinc-700">« {r.details} »</p>}
            {r.status === "OUVERT" && (
              <div className="flex flex-wrap gap-2">
                {r.listing && !r.listing.removedByAdmin && <AdminMarketButton kind="listing" id={r.listing.id} removed label="Retirer l'annonce" danger />}
                {r.shop && !r.shop.suspended && <AdminMarketButton kind="shop" id={r.shop.id} suspended label="Suspendre la boutique" danger />}
                <AdminMarketButton kind="report" id={r.id} status="TRAITE" label="Marquer traité" />
                <AdminMarketButton kind="report" id={r.id} status="REJETE" label="Rejeter" />
              </div>
            )}
          </div>
        ))}
      </div>
      <Pagination page={page} pageSize={ADMIN_PAGE_SIZE} total={count ?? 0} href={(n) => `/admin/marche?onglet=signalements${n > 1 ? `&page=${n}` : ""}`} noun="signalements" />
    </div>
  );
}

async function ShopsTab({ page }: { page: number }) {
  const from = (page - 1) * ADMIN_PAGE_SIZE;
  const { data, count } = await supabase
    .from("market_shops")
    .select("id, name, slug, city, published, suspended, suspendedReason:suspended_reason, viewCount:view_count, createdAt:created_at, business:businesses(name, phone)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + ADMIN_PAGE_SIZE - 1);
  const shops = (data ?? []) as unknown as {
    id: string;
    name: string;
    slug: string;
    city: string | null;
    published: boolean;
    suspended: boolean;
    suspendedReason: string | null;
    viewCount: number;
    createdAt: string;
    business: { name: string; phone: string | null } | null;
  }[];
  if (shops.length === 0) return <Empty text="Aucune boutique." />;
  return (
    <div className="space-y-3">
      <Table head={["Boutique", "Commerce", "État", "Visites", ""]}>
        {shops.map((s) => (
          <tr key={s.id}>
            <td className="px-4 py-3">
              <Link href={`/marche/boutique/${s.slug}`} target="_blank" className="font-semibold text-zinc-900 hover:underline">
                {s.name}
              </Link>
              <p className="text-xs text-zinc-500">
                {s.city ?? "—"} · depuis le {formatDateTime(s.createdAt).split(" ")[0]}
              </p>
            </td>
            <td className="px-4 py-3 text-zinc-600">
              {s.business?.name}
              <p className="text-xs text-zinc-500">{s.business?.phone}</p>
            </td>
            <td className="px-4 py-3">
              {s.suspended ? (
                <span className="text-xs font-semibold text-red-700">Suspendue{s.suspendedReason ? ` : ${s.suspendedReason}` : ""}</span>
              ) : s.published ? (
                <span className="text-xs font-semibold text-emerald-700">En ligne</span>
              ) : (
                <span className="text-xs text-zinc-500">Masquée par le vendeur</span>
              )}
            </td>
            <td className="px-4 py-3 text-right">{s.viewCount}</td>
            <td className="px-4 py-3 text-right">
              {s.suspended ? (
                <AdminMarketButton kind="shop" id={s.id} suspended={false} label="Rétablir" />
              ) : (
                <AdminMarketButton kind="shop" id={s.id} suspended label="Suspendre" danger />
              )}
            </td>
          </tr>
        ))}
      </Table>
      <Pagination page={page} pageSize={ADMIN_PAGE_SIZE} total={count ?? 0} href={(n) => `/admin/marche?onglet=boutiques${n > 1 ? `&page=${n}` : ""}`} noun="boutiques" />
    </div>
  );
}

async function OrdersTab({ page }: { page: number }) {
  const from = (page - 1) * ADMIN_PAGE_SIZE;
  const { data, count } = await supabase
    .from("market_orders")
    .select("id, number, status, total, customerName:customer_name, customerPhone:customer_phone, createdAt:created_at, shop:market_shops(name)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + ADMIN_PAGE_SIZE - 1);
  const orders = (data ?? []) as unknown as {
    id: string;
    number: string;
    status: string;
    total: number;
    customerName: string;
    customerPhone: string;
    createdAt: string;
    shop: { name: string } | null;
  }[];
  if (orders.length === 0) return <Empty text="Aucune commande." />;
  return (
    <div className="space-y-3">
      <Table head={["Commande", "Boutique", "Client", "Montant", "Statut"]}>
        {orders.map((o) => (
          <tr key={o.id}>
            <td className="px-4 py-3">
              <p className="font-semibold text-zinc-900">{o.number}</p>
              <p className="text-xs text-zinc-500">{formatDateTime(o.createdAt)}</p>
            </td>
            <td className="px-4 py-3 text-zinc-600">{o.shop?.name}</td>
            <td className="px-4 py-3">
              {o.customerName}
              <p className="text-xs text-zinc-500">{o.customerPhone}</p>
            </td>
            <td className="px-4 py-3 text-right font-semibold">{formatMoney(o.total)}</td>
            <td className="px-4 py-3">
              <OrderStatusBadge status={o.status} label={marketOrderStatusLabel(o.status)} />
            </td>
          </tr>
        ))}
      </Table>
      <Pagination page={page} pageSize={ADMIN_PAGE_SIZE} total={count ?? 0} href={(n) => `/admin/marche?onglet=commandes${n > 1 ? `&page=${n}` : ""}`} noun="commandes" />
    </div>
  );
}

async function ReviewsTab({ page }: { page: number }) {
  const from = (page - 1) * ADMIN_PAGE_SIZE;
  const { data, count } = await supabase
    .from("market_reviews")
    .select("id, rating, comment, hidden, createdAt:created_at, buyer:market_buyers(name), product:products(name), shop:market_shops(name)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + ADMIN_PAGE_SIZE - 1);
  const reviews = (data ?? []) as unknown as {
    id: string;
    rating: number;
    comment: string | null;
    hidden: boolean;
    createdAt: string;
    buyer: { name: string } | null;
    product: { name: string } | null;
    shop: { name: string } | null;
  }[];
  if (reviews.length === 0) return <Empty text="Aucun avis." />;
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {reviews.map((r) => (
          <div key={r.id} className={`flex flex-wrap items-start justify-between gap-3 rounded-2xl bg-white p-4 ring-1 ring-zinc-200 ${r.hidden ? "opacity-60" : ""}`}>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <StarRow rating={r.rating} />
                <span className="font-semibold text-zinc-900">{r.buyer?.name}</span>
                <span className="text-xs text-zinc-500">
                  {r.product?.name} · {r.shop?.name} · {formatDateTime(r.createdAt)}
                  {r.hidden ? " · masqué" : ""}
                </span>
              </div>
              {r.comment && <p className="text-sm text-zinc-700">{r.comment}</p>}
            </div>
            <AdminMarketButton kind="review" id={r.id} hidden={!r.hidden} label={r.hidden ? "Réafficher" : "Masquer"} danger={!r.hidden} />
          </div>
        ))}
      </div>
      <Pagination page={page} pageSize={ADMIN_PAGE_SIZE} total={count ?? 0} href={(n) => `/admin/marche?onglet=avis${n > 1 ? `&page=${n}` : ""}`} noun="avis" />
    </div>
  );
}

async function BuyersTab({ page }: { page: number }) {
  const from = (page - 1) * ADMIN_PAGE_SIZE;
  const { data, count } = await supabase
    .from("market_buyers")
    .select("id, name, phone, kind, companyName:company_name, city, blocked, createdAt:created_at, lastLoginAt:last_login_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + ADMIN_PAGE_SIZE - 1);
  const buyers = (data ?? []) as unknown as {
    id: string;
    name: string;
    phone: string;
    kind: string;
    companyName: string | null;
    city: string | null;
    blocked: boolean;
    createdAt: string;
    lastLoginAt: string | null;
  }[];
  if (buyers.length === 0) return <Empty text="Aucun acheteur." />;
  return (
    <div className="space-y-3">
      <Table head={["Acheteur", "Type", "Inscrit le", "Dernière connexion", ""]}>
        {buyers.map((b) => (
          <tr key={b.id} className={b.blocked ? "opacity-60" : ""}>
            <td className="px-4 py-3">
              <p className="font-semibold text-zinc-900">{b.name}</p>
              <p className="text-xs text-zinc-500">
                {b.phone}
                {b.city ? ` · ${b.city}` : ""}
              </p>
            </td>
            <td className="px-4 py-3 text-zinc-600">{b.kind === "PRO" ? `Pro · ${b.companyName}` : "Particulier"}</td>
            <td className="px-4 py-3 text-zinc-600">{formatDateTime(b.createdAt).split(" ")[0]}</td>
            <td className="px-4 py-3 text-zinc-600">{b.lastLoginAt ? formatDateTime(b.lastLoginAt) : "—"}</td>
            <td className="px-4 py-3 text-right">
              {b.blocked ? <AdminMarketButton kind="buyer" id={b.id} blocked={false} label="Débloquer" /> : <AdminMarketButton kind="buyer" id={b.id} blocked label="Bloquer" danger />}
            </td>
          </tr>
        ))}
      </Table>
      <Pagination page={page} pageSize={ADMIN_PAGE_SIZE} total={count ?? 0} href={(n) => `/admin/marche?onglet=acheteurs${n > 1 ? `&page=${n}` : ""}`} noun="acheteurs" />
    </div>
  );
}

function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-zinc-200">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="bg-zinc-50 text-left text-xs uppercase text-zinc-500">
          <tr>
            {head.map((h, i) => (
              <th key={i} className="px-4 py-2">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">{children}</tbody>
      </table>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-2xl bg-white p-8 text-center text-sm text-zinc-500 ring-1 ring-zinc-200">{text}</p>;
}

async function TopupsTab({ page }: { page: number }) {
  const from = (page - 1) * ADMIN_PAGE_SIZE;
  const { data, count } = await supabase
    .from("market_topups")
    .select("id, amount, operator, reference, status, rejectReason:reject_reason, submittedAt:submitted_at, business:businesses(name, phone)", { count: "exact" })
    .order("status")
    .order("submitted_at", { ascending: false })
    .range(from, from + ADMIN_PAGE_SIZE - 1);
  const topups = (data ?? []) as unknown as {
    id: string;
    amount: number;
    operator: string;
    reference: string;
    status: string;
    rejectReason: string | null;
    submittedAt: string;
    business: { name: string; phone: string | null } | null;
  }[];
  if (topups.length === 0) return <Empty text="Aucune recharge." />;
  return (
    <div className="space-y-3">
      <Table head={["Commerce", "Montant", "Transfert", "Déclarée le", "Décision"]}>
        {topups.map((t) => (
          <tr key={t.id} className={t.status === "EN_ATTENTE" ? "" : "opacity-60"}>
            <td className="px-4 py-3">
              <p className="font-semibold text-zinc-900">{t.business?.name}</p>
              <p className="text-xs text-zinc-500">{t.business?.phone}</p>
            </td>
            <td className="px-4 py-3 font-bold">{formatMoney(t.amount)}</td>
            <td className="px-4 py-3">
              {t.operator === "ORANGE" ? "Orange Money" : "Moov Money"}
              <p className="font-mono text-xs text-zinc-600">{t.reference}</p>
            </td>
            <td className="px-4 py-3 text-zinc-600">{formatDateTime(t.submittedAt)}</td>
            <td className="px-4 py-3">
              {t.status === "EN_ATTENTE" ? (
                <TopupButtons topupId={t.id} amount={t.amount} />
              ) : t.status === "VALIDEE" ? (
                <span className="text-xs font-semibold text-emerald-700">Créditée</span>
              ) : (
                <span className="text-xs text-red-600">Refusée : {t.rejectReason}</span>
              )}
            </td>
          </tr>
        ))}
      </Table>
      <Pagination page={page} pageSize={ADMIN_PAGE_SIZE} total={count ?? 0} href={(n) => `/admin/marche?onglet=recharges${n > 1 ? `&page=${n}` : ""}`} noun="recharges" />
    </div>
  );
}

async function PricesTab() {
  const { data } = await supabase.from("market_boost_prices").select("kind, days, price, active").order("kind").order("days");
  const prices = (data ?? []) as { kind: "PRODUIT" | "BOUTIQUE"; days: number; price: number; active: boolean }[];
  return (
    <div className="space-y-6">
      {(["PRODUIT", "BOUTIQUE"] as const).map((kind) => (
        <section key={kind} className="space-y-2">
          <h2 className="font-semibold text-zinc-900">{kind === "PRODUIT" ? "Produit mis en avant" : "Boutique mise en avant"}</h2>
          <Table head={["Durée", "Prix", "", ""]}>
            {prices
              .filter((p) => p.kind === kind)
              .map((p) => (
                <PriceRow key={`${p.kind}-${p.days}`} kind={p.kind} days={p.days} price={p.price} active={p.active} />
              ))}
          </Table>
        </section>
      ))}
    </div>
  );
}
