import { CheckCircle2, Package } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getCurrentBuyer } from "@/lib/market-buyer";
import { marketOrderStatusLabel } from "@/lib/market";
import { formatMoney, formatDateTime } from "@/lib/format";
import { OrderStatusBadge } from "@/components/market/OrderStatusBadge";
import { Pagination, readPage } from "@/components/market/Pagination";

const PAGE_SIZE = 20;

export const dynamic = "force-dynamic";

const TABS = [
  { key: "", label: "Toutes" },
  { key: "en-cours", label: "En cours" },
  { key: "terminees", label: "Terminées" },
  { key: "annulees", label: "Annulées" },
];

export default async function MyMarketOrdersPage({ searchParams }: { searchParams: Promise<{ nouvelles?: string; filtre?: string; page?: string }> }) {
  const buyer = await getCurrentBuyer();
  if (!buyer) redirect("/marche/compte?suite=/marche/commandes");
  const { nouvelles, filtre = "", page: pageParam } = await searchParams;
  const page = readPage(pageParam);
  const from = (page - 1) * PAGE_SIZE;

  let query = supabase
    .from("market_orders")
    .select("id, number, status, total, currency, createdAt:created_at, shop:market_shops(name), items:market_order_items(name, photoUrl:photo_url)", { count: "exact" })
    .eq("buyer_id", buyer.id)
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);
  if (filtre === "en-cours") query = query.not("status", "in", "(LIVREE,ANNULEE)");
  if (filtre === "terminees") query = query.eq("status", "LIVREE");
  if (filtre === "annulees") query = query.eq("status", "ANNULEE");
  const { data, count } = await query;
  const orders = (data ?? []) as unknown as {
    id: string;
    number: string;
    status: string;
    total: number;
    currency: string;
    createdAt: string;
    shop: { name: string } | null;
    items: { name: string; photoUrl: string | null }[];
  }[];

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {nouvelles && (
        <div className="rounded-2xl bg-emerald-50 p-4 text-center ring-1 ring-emerald-200">
          <CheckCircle2 className="mx-auto h-9 w-9 text-emerald-600" />
          <p className="font-bold text-emerald-900">Commande confirmée !</p>
          <p className="text-sm text-emerald-800">
            N° {nouvelles.split(",").join(", ")}. Le vendeur va la confirmer : suivez-la ci-dessous.
          </p>
        </div>
      )}
      <h1 className="text-lg font-bold text-zinc-900">Mes commandes</h1>
      <div className="flex gap-2 overflow-x-auto text-sm">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={t.key ? `/marche/commandes?filtre=${t.key}` : "/marche/commandes"}
            className={filtre === t.key ? "shrink-0 rounded-full bg-zindo-green-600 px-3 py-1.5 font-semibold text-white" : "shrink-0 rounded-full bg-white px-3 py-1.5 text-zinc-700 ring-1 ring-zinc-200"}
          >
            {t.label}
          </Link>
        ))}
      </div>
      {orders.length === 0 && <p className="rounded-2xl bg-white p-6 text-center text-sm text-zinc-500">Aucune commande.</p>}
      {orders.map((o) => (
        <Link key={o.id} href={`/marche/commandes/${o.number}`} className="flex items-center gap-3 rounded-2xl bg-white p-4 ring-1 ring-zinc-200 hover:shadow-sm">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-zinc-900">{o.number}</p>
            <p className="text-xs text-zinc-500">
              {formatDateTime(o.createdAt)} · {o.shop?.name}
            </p>
            <p className="text-sm font-bold text-zinc-900">{formatMoney(o.total, o.currency)}</p>
            <OrderStatusBadge status={o.status} label={marketOrderStatusLabel(o.status)} />
          </div>
          <div className="flex -space-x-2">
            {o.items.slice(0, 3).map((i, idx) =>
              i.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={idx} src={i.photoUrl} alt="" className="h-11 w-11 rounded-lg object-cover ring-2 ring-white" />
              ) : (
                <span key={idx} className="flex h-11 w-11 items-center justify-center rounded-lg bg-zinc-100 ring-2 ring-white"><Package className="h-5 w-5 text-zinc-400" /></span>
              )
            )}
          </div>
        </Link>
      ))}
      <Pagination page={page} pageSize={PAGE_SIZE} total={count ?? 0} href={(p) => `/marche/commandes?${new URLSearchParams({ ...(filtre ? { filtre } : {}), ...(p > 1 ? { page: String(p) } : {}) })}`} noun="commandes" />
    </div>
  );
}
