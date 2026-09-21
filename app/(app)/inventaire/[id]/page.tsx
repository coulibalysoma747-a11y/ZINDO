import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { formatDateTime } from "@/lib/format";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from "@/components/ui/Table";
import { ValidateInventoryButton } from "./ValidateInventoryButton";

// La validation d'un inventaire peut porter sur des dizaines/centaines de
// produits (voir validateInventoryAction) — marge de sécurité.
export const maxDuration = 30;

type InventoryRow = {
  id: string;
  reference: string;
  createdAt: string;
  status: string;
  location: { name: string };
  user: { firstName: string; lastName: string };
  items: Array<{ id: string; theoreticalQty: number; realQty: number; difference: number; product: { name: string } }>;
};

export default async function InventoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePermission(PERMISSIONS.INVENTORY_MANAGE);
  const { id } = await params;

  const { data } = await supabase
    .from("inventories")
    .select(
      "id, reference, createdAt:created_at, status, location:locations(name), user:users(firstName:first_name, lastName:last_name), " +
        "items:inventory_items(id, theoreticalQty:theoretical_qty, realQty:real_qty, difference, product:products(name))"
    )
    .eq("id", id)
    .eq("business_id", user.businessId)
    .maybeSingle();
  if (!data) notFound();
  const inventory = data as unknown as InventoryRow;

  const discrepancies = inventory.items.filter((i) => i.difference !== 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/inventaire" className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700">
            <ArrowLeft className="h-4 w-4" /> Retour à l&apos;inventaire
          </Link>
          <div className="mt-1 flex items-center gap-3">
            <h1 className="text-xl font-bold text-zinc-900">{inventory.reference}</h1>
            <Badge tone={inventory.status === "VALIDE" ? "emerald" : "amber"}>{inventory.status}</Badge>
          </div>
          <p className="text-sm text-zinc-500">
            {inventory.location.name} · {formatDateTime(new Date(inventory.createdAt))} · par {inventory.user.firstName}{" "}
            {inventory.user.lastName}
          </p>
        </div>
        {inventory.status === "EN_COURS" && (
          <ValidateInventoryButton inventoryId={inventory.id} discrepancyCount={discrepancies.length} />
        )}
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-zinc-900">Comptage</h2>
        </CardHeader>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <Table className="min-w-[420px]">
              <TableHead>
                <tr>
                  <TableHeaderCell>Produit</TableHeaderCell>
                  <TableHeaderCell align="right">Stock théorique</TableHeaderCell>
                  <TableHeaderCell align="right">Stock réel</TableHeaderCell>
                  <TableHeaderCell align="right">Écart</TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {inventory.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium text-zinc-900 dark:text-slate-100">{item.product.name}</TableCell>
                    <TableCell align="right" className="tabular-nums text-zinc-700 dark:text-slate-300">{item.theoreticalQty}</TableCell>
                    <TableCell align="right" className="tabular-nums text-zinc-700 dark:text-slate-300">{item.realQty}</TableCell>
                    <TableCell
                      align="right"
                      className={`font-medium tabular-nums ${
                        item.difference === 0 ? "text-zinc-400" : item.difference > 0 ? "text-emerald-600" : "text-red-600"
                      }`}
                    >
                      {item.difference > 0 ? `+${item.difference}` : item.difference}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
