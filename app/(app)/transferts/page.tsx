import Link from "next/link";
import { Plus, ArrowRight } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { formatDateTime } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/Empty";
import { ButtonLink } from "@/components/ui/Button";
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from "@/components/ui/Table";

type TransferRow = {
  id: string;
  number: string;
  createdAt: string;
  fromLocationId: string;
  toLocationId: string;
  user: { firstName: string; lastName: string };
  items: Array<{ id: string }>;
};

export default async function TransfersPage() {
  const user = await requirePermission(PERMISSIONS.TRANSFERS_MANAGE);

  const { data } = await supabase
    .from("stock_transfers")
    .select(
      "id, number, createdAt:created_at, fromLocationId:from_location_id, toLocationId:to_location_id, user:users(firstName:first_name, lastName:last_name), items:stock_transfer_items(id)"
    )
    .eq("business_id", user.businessId)
    .order("created_at", { ascending: false })
    .limit(200);
  const transfers = (data ?? []) as unknown as TransferRow[];

  // Requête séparée plutôt qu'un embed PostgREST sur deux FK vers la même
  // table (locations) : évite de dépendre du nom exact de la contrainte FK
  // générée par Postgres pour lever l'ambiguïté from/to.
  const locationIds = Array.from(new Set(transfers.flatMap((t) => [t.fromLocationId, t.toLocationId])));
  const { data: locations } = locationIds.length
    ? await supabase.from("locations").select("id, name").in("id", locationIds)
    : { data: [] as { id: string; name: string }[] };
  const locationNames = new Map((locations ?? []).map((l) => [l.id as string, l.name as string]));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Transferts de marchandises</h1>
          <p className="text-sm text-zinc-500">{transfers.length} transfert(s) entre boutiques et dépôts</p>
        </div>
        <ButtonLink href="/transferts/nouveau">
          <Plus className="h-4 w-4" /> Nouveau transfert
        </ButtonLink>
      </div>

      {transfers.length === 0 ? (
        <EmptyState
          title="Aucun transfert enregistré"
          description="Déplacez de la marchandise entre votre dépôt et vos boutiques."
          action={
            <ButtonLink href="/transferts/nouveau">
              <Plus className="h-4 w-4" /> Nouveau transfert
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
                <TableHeaderCell>Trajet</TableHeaderCell>
                <TableHeaderCell>Produits</TableHeaderCell>
                <TableHeaderCell>Par</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {transfers.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>
                    <Link href={`/transferts/${t.id}`} className="font-mono text-xs text-emerald-600 hover:underline">
                      {t.number}
                    </Link>
                  </TableCell>
                  <TableCell className="text-zinc-600 dark:text-slate-400">{formatDateTime(new Date(t.createdAt))}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5 text-zinc-700 dark:text-slate-300">
                      {locationNames.get(t.fromLocationId) ?? "—"} <ArrowRight className="h-3.5 w-3.5 text-zinc-400" />{" "}
                      {locationNames.get(t.toLocationId) ?? "—"}
                    </span>
                  </TableCell>
                  <TableCell className="text-zinc-600 dark:text-slate-400">{t.items.length} référence(s)</TableCell>
                  <TableCell className="text-zinc-600 dark:text-slate-400">
                    {t.user.firstName} {t.user.lastName}
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
