import Link from "next/link";
import { Plus } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { formatMoney, formatDateTime } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/Empty";
import { ButtonLink } from "@/components/ui/Button";
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from "@/components/ui/Table";

type PurchaseRow = {
  id: string;
  number: string;
  createdAt: string;
  status: string;
  total: number;
  amountPaid: number;
  location: { name: string };
  supplier: { name: string };
};

export default async function PurchasesPage() {
  const user = await requirePermission(PERMISSIONS.PURCHASES_MANAGE);

  const { data } = await supabase
    .from("purchases")
    .select(
      "id, number, createdAt:created_at, status, total, amountPaid:amount_paid, location:locations(name), supplier:suppliers(name)"
    )
    .eq("business_id", user.businessId)
    .order("created_at", { ascending: false })
    .limit(200);
  const purchases = (data ?? []) as unknown as PurchaseRow[];

  const currency = user.business.currency;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Achats</h1>
          <p className="text-sm text-zinc-500">{purchases.length} achat(s)</p>
        </div>
        <ButtonLink href="/achats/nouveau">
          <Plus className="h-4 w-4" /> Nouvel achat
        </ButtonLink>
      </div>

      {purchases.length === 0 ? (
        <EmptyState
          title="Aucun achat enregistré"
          description="Enregistrez la réception d'une marchandise pour augmenter votre stock."
          action={
            <ButtonLink href="/achats/nouveau">
              <Plus className="h-4 w-4" /> Nouvel achat
            </ButtonLink>
          }
        />
      ) : (
        <Card className="overflow-x-auto">
          <Table className="min-w-[700px]">
            <TableHead>
              <TableRow interactive={false}>
                <TableHeaderCell>N°</TableHeaderCell>
                <TableHeaderCell>Date</TableHeaderCell>
                <TableHeaderCell>Boutique</TableHeaderCell>
                <TableHeaderCell>Fournisseur</TableHeaderCell>
                <TableHeaderCell>Statut</TableHeaderCell>
                <TableHeaderCell align="right">Total</TableHeaderCell>
                <TableHeaderCell align="right">Payé</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {purchases.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <Link href={`/achats/${p.id}`} className="font-mono text-xs text-emerald-600 hover:underline">
                      {p.number}
                    </Link>
                  </TableCell>
                  <TableCell className="text-zinc-600 dark:text-slate-400">{formatDateTime(new Date(p.createdAt))}</TableCell>
                  <TableCell className="text-zinc-600 dark:text-slate-400">{p.location.name}</TableCell>
                  <TableCell className="text-zinc-600 dark:text-slate-400">{p.supplier.name}</TableCell>
                  <TableCell>
                    <Badge tone={p.status === "RECUE" ? "emerald" : p.status === "PARTIELLE" ? "amber" : "zinc"}>
                      {p.status}
                    </Badge>
                  </TableCell>
                  <TableCell align="right" className="font-medium text-zinc-900 tabular-nums dark:text-slate-100">
                    {formatMoney(p.total, currency)}
                  </TableCell>
                  <TableCell align="right" className="text-zinc-600 tabular-nums dark:text-slate-400">
                    {formatMoney(p.amountPaid, currency)}
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
