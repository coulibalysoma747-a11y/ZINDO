import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatDateTime, formatMoney } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/Empty";

const STATUS_LABELS = {
  PAYEE: "Payée",
  PARTIELLE: "Partielle",
  CREDIT: "Crédit",
  ANNULEE: "Annulée",
} as const;

const STATUS_TONE = {
  PAYEE: "emerald",
  PARTIELLE: "amber",
  CREDIT: "red",
  ANNULEE: "zinc",
} as const;

type SaleRow = {
  id: string;
  number: string;
  createdAt: string;
  status: keyof typeof STATUS_LABELS;
  total: number;
  amountPaid: number;
  location: { name: string } | null;
  customer: { name: string } | null;
};

export default async function AdminBusinessSalesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string; statut?: string }>;
}) {
  const { id } = await params;
  const { q, statut } = await searchParams;

  const { data: businessData } = await supabase.from("businesses").select("id, name, currency").eq("id", id).maybeSingle();
  if (!businessData) notFound();
  const business = businessData as unknown as { id: string; name: string; currency: string };

  let query = supabase
    .from("sales")
    .select(
      "id, number, createdAt:created_at, status, total, amountPaid:amount_paid, location:locations(name), customer:customers(name)"
    )
    .eq("business_id", id)
    .order("created_at", { ascending: false })
    .limit(150);
  if (q) query = query.ilike("number", `%${q}%`);
  if (statut) query = query.eq("status", statut);

  const { data } = await query;
  const sales = (data ?? []) as unknown as SaleRow[];

  return (
    <div className="space-y-6">
      <Link
        href={`/admin/commercants/${id}`}
        className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700"
      >
        <ArrowLeft className="h-4 w-4" /> Retour à {business.name}
      </Link>

      <div>
        <h1 className="text-xl font-bold text-zinc-900">Ventes — {business.name}</h1>
        <p className="text-sm text-zinc-500">
          Corriger ou annuler une vente d&apos;un commerçant directement depuis la console admin, sans usurper
          son compte. 150 ventes les plus récentes affichées.
        </p>
      </div>

      <form method="GET" className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          name="q"
          defaultValue={q ?? ""}
          placeholder="N° de vente..."
          className="h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zindo-green-500"
        />
        <select
          name="statut"
          defaultValue={statut ?? ""}
          className="h-9 rounded-lg border border-zinc-200 bg-white px-2 text-sm outline-none focus:border-zindo-green-500"
        >
          <option value="">Tous les statuts</option>
          {Object.entries(STATUS_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
        >
          Filtrer
        </button>
        {(q || statut) && (
          <Link href={`/admin/commercants/${id}/ventes`} className="text-sm text-zinc-400 hover:text-zinc-600">
            Réinitialiser
          </Link>
        )}
      </form>

      {sales.length === 0 ? (
        <EmptyState title="Aucune vente trouvée" description="Aucune vente ne correspond à ces filtres." />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-zinc-50 text-left text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">N°</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Boutique</th>
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Payé</th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {sales.map((s) => (
                <tr key={s.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3 font-medium text-zinc-900">{s.number}</td>
                  <td className="px-4 py-3 text-zinc-600">{formatDateTime(new Date(s.createdAt))}</td>
                  <td className="px-4 py-3 text-zinc-600">{s.location?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-zinc-600">{s.customer?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-zinc-600">{formatMoney(s.total, business.currency)}</td>
                  <td className="px-4 py-3 text-zinc-600">{formatMoney(s.amountPaid, business.currency)}</td>
                  <td className="px-4 py-3">
                    <Badge tone={STATUS_TONE[s.status]}>{STATUS_LABELS[s.status]}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/commercants/${id}/ventes/${s.id}`}
                      className="rounded-lg border border-zindo-green-200 px-2.5 py-1.5 text-xs font-medium text-zindo-green-600 hover:bg-zindo-green-50"
                    >
                      Corriger
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
