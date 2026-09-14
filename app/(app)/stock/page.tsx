import Link from "next/link";
import { ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { formatDateTime, startOfToday, startOfYesterday, startOfWeek, startOfMonth } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/Empty";
import { ButtonLink } from "@/components/ui/Button";
import { HistoryFilters } from "@/components/history/HistoryFilters";

const REASON_LABELS: Record<string, string> = {
  ACHAT: "Achat",
  RETOUR_CLIENT: "Retour client",
  CORRECTION: "Correction",
  INVENTAIRE: "Inventaire",
  VENTE: "Vente",
  PRODUIT_ENDOMMAGE: "Produit endommagé",
  PERTE: "Perte",
  RETOUR_FOURNISSEUR: "Retour fournisseur",
  TRANSFERT: "Transfert",
  AUTRE: "Autre",
};

export default async function StockPage({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string }>;
}) {
  const user = await requirePermission(PERMISSIONS.STOCK_VIEW);
  const { periode } = await searchParams;

  let query = supabase
    .from("stock_movements")
    .select(
      "id, createdAt:created_at, direction, reason, quantity, oldStock:old_stock, newStock:new_stock, productId:product_id, product:products(name), location:locations(name), user:users(firstName:first_name, lastName:last_name)"
    )
    .eq("business_id", user.businessId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (periode === "aujourdhui") query = query.gte("created_at", startOfToday().toISOString());
  else if (periode === "hier")
    query = query.gte("created_at", startOfYesterday().toISOString()).lt("created_at", startOfToday().toISOString());
  else if (periode === "semaine") query = query.gte("created_at", startOfWeek().toISOString());
  else if (periode === "mois") query = query.gte("created_at", startOfMonth().toISOString());

  const { data } = await query;
  const movements = (data ?? []) as unknown as Array<{
    id: string;
    createdAt: string;
    direction: string;
    reason: string;
    quantity: number;
    oldStock: number;
    newStock: number;
    productId: string;
    product: { name: string };
    location: { name: string };
    user: { firstName: string; lastName: string };
  }>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Mouvements de stock</h1>
          <p className="text-sm text-zinc-500">{movements.length} mouvement(s)</p>
        </div>
        <div className="flex gap-2">
          <ButtonLink href="/stock/entree" variant="secondary">
            <ArrowDownCircle className="h-4 w-4" /> Entrée
          </ButtonLink>
          <ButtonLink href="/stock/sortie" variant="secondary">
            <ArrowUpCircle className="h-4 w-4" /> Sortie
          </ButtonLink>
        </div>
      </div>

      <HistoryFilters paramName="periode" />

      {movements.length === 0 ? (
        <EmptyState title="Aucun mouvement sur cette période" />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead className="bg-zinc-50 text-left text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Boutique</th>
                <th className="px-4 py-3 font-medium">Produit</th>
                <th className="px-4 py-3 font-medium">Motif</th>
                <th className="px-4 py-3 text-right font-medium">Quantité</th>
                <th className="px-4 py-3 text-right font-medium">Stock avant → après</th>
                <th className="px-4 py-3 font-medium">Utilisateur</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {movements.map((m) => (
                <tr key={m.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3 text-zinc-600">{formatDateTime(new Date(m.createdAt))}</td>
                  <td className="px-4 py-3 text-zinc-600">{m.location.name}</td>
                  <td className="px-4 py-3">
                    <Link href={`/produits/${m.productId}`} className="font-medium text-zinc-900 hover:text-emerald-600">
                      {m.product.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={m.direction === "IN" ? "emerald" : "red"}>
                      {REASON_LABELS[m.reason] ?? m.reason}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-700">
                    {m.direction === "IN" ? "+" : "-"}
                    {m.quantity}
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-500">
                    {m.oldStock} → {m.newStock}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    {m.user.firstName} {m.user.lastName}
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
