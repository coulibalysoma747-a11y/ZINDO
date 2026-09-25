import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus, PackagePlus } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { formatDateTime } from "@/lib/format";
import { isPurchaseOrdersModuleEnabled } from "@/lib/actions/purchase-orders";
import {
  PURCHASE_ORDER_STATUS_LABELS,
  PURCHASE_ORDER_STATUS_TONES,
  purchaseOrderDisplayNumber,
  type PurchaseOrderStatus,
} from "@/lib/purchase-orders";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/Empty";
import { ButtonLink } from "@/components/ui/Button";
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from "@/components/ui/Table";

type OrderRow = {
  id: string;
  number: string;
  groupNumber: string;
  status: PurchaseOrderStatus;
  createdAt: string;
  supplier: { name: string };
  items: { count: number }[];
};

export default async function PurchaseOrdersPage() {
  const user = await requirePermission(PERMISSIONS.PURCHASES_MANAGE);
  if (!(await isPurchaseOrdersModuleEnabled(user.businessId))) notFound();

  const { data } = await supabase
    .from("purchase_orders")
    .select("id, number, groupNumber:group_number, status, createdAt:created_at, supplier:suppliers(name), items:purchase_order_items(count)")
    .eq("business_id", user.businessId)
    .order("created_at", { ascending: false })
    .limit(200);
  const orders = (data ?? []) as unknown as OrderRow[];
  const groupSizes = new Map<string, number>();
  for (const o of orders) groupSizes.set(o.groupNumber, (groupSizes.get(o.groupNumber) ?? 0) + 1);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-slate-100">Demandes de prix et bons de commande</h1>
          <p className="text-sm text-zinc-500">
            Envoyez une demande sans prix, saisissez les prix du fournisseur, confirmez, puis réceptionnez.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href="/reassort" variant="outline">
            <PackagePlus className="h-4 w-4" /> Réassort
          </ButtonLink>
          <ButtonLink href="/achats/commandes/nouveau">
            <Plus className="h-4 w-4" /> Nouvelle demande
          </ButtonLink>
        </div>
      </div>

      {orders.length === 0 ? (
        <EmptyState
          title="Aucune demande de prix"
          description="Partez des suggestions du réassort ou composez votre propre liste."
          action={
            <ButtonLink href="/achats/commandes/nouveau">
              <Plus className="h-4 w-4" /> Nouvelle demande
            </ButtonLink>
          }
        />
      ) : (
        <Card className="overflow-x-auto">
          <Table className="min-w-[640px]">
            <TableHead>
              <TableRow interactive={false}>
                <TableHeaderCell>N°</TableHeaderCell>
                <TableHeaderCell>Date</TableHeaderCell>
                <TableHeaderCell>Fournisseur</TableHeaderCell>
                <TableHeaderCell>Produits</TableHeaderCell>
                <TableHeaderCell>Statut</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {orders.map((o) => (
                <TableRow key={o.id}>
                  <TableCell>
                    <Link href={`/achats/commandes/${o.id}`} className="font-mono text-xs text-emerald-600 hover:underline">
                      {purchaseOrderDisplayNumber(o.number, o.status)}
                    </Link>
                    {(groupSizes.get(o.groupNumber) ?? 0) > 1 && (
                      <span className="ml-2 text-xs text-zinc-400">mise en concurrence</span>
                    )}
                  </TableCell>
                  <TableCell className="text-zinc-600 dark:text-slate-400">{formatDateTime(new Date(o.createdAt))}</TableCell>
                  <TableCell className="text-zinc-600 dark:text-slate-400">{o.supplier.name}</TableCell>
                  <TableCell className="text-zinc-600 dark:text-slate-400">{o.items[0]?.count ?? 0}</TableCell>
                  <TableCell>
                    <Badge tone={PURCHASE_ORDER_STATUS_TONES[o.status]}>{PURCHASE_ORDER_STATUS_LABELS[o.status]}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
