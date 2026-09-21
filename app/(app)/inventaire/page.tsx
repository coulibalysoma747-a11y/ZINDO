import Link from "next/link";
import { Plus } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { formatDateTime } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/Empty";
import { ButtonLink } from "@/components/ui/Button";
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from "@/components/ui/Table";

type InventoryRow = {
  id: string;
  reference: string;
  createdAt: string;
  status: string;
  location: { name: string };
  items: Array<{ id: string }>;
};

export default async function InventoryListPage() {
  const user = await requirePermission(PERMISSIONS.INVENTORY_MANAGE);

  const { data } = await supabase
    .from("inventories")
    .select("id, reference, createdAt:created_at, status, location:locations(name), items:inventory_items(id)")
    .eq("business_id", user.businessId)
    .order("created_at", { ascending: false });
  const inventories = (data ?? []) as unknown as InventoryRow[];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Inventaire</h1>
          <p className="text-sm text-zinc-500">Comparez le stock théorique au stock réel.</p>
        </div>
        <ButtonLink href="/inventaire/nouveau">
          <Plus className="h-4 w-4" /> Nouvel inventaire
        </ButtonLink>
      </div>

      {inventories.length === 0 ? (
        <EmptyState title="Aucun inventaire" description="Lancez votre premier comptage de stock." />
      ) : (
        <Card className="overflow-x-auto">
          <Table className="min-w-[600px]">
            <TableHead>
              <TableRow interactive={false}>
                <TableHeaderCell>Référence</TableHeaderCell>
                <TableHeaderCell>Boutique</TableHeaderCell>
                <TableHeaderCell>Date</TableHeaderCell>
                <TableHeaderCell>Produits comptés</TableHeaderCell>
                <TableHeaderCell>Statut</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {inventories.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell>
                    <Link href={`/inventaire/${inv.id}`} className="font-mono text-xs text-emerald-600 hover:underline">
                      {inv.reference}
                    </Link>
                  </TableCell>
                  <TableCell className="text-zinc-600 dark:text-slate-400">{inv.location.name}</TableCell>
                  <TableCell className="text-zinc-600 dark:text-slate-400">{formatDateTime(new Date(inv.createdAt))}</TableCell>
                  <TableCell className="text-zinc-600 dark:text-slate-400">{inv.items.length}</TableCell>
                  <TableCell>
                    <Badge tone={inv.status === "VALIDE" ? "emerald" : "amber"}>{inv.status}</Badge>
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
