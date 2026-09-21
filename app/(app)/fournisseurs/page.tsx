import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { getActivityConfig, resolveTerm } from "@/lib/activity-config";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/Empty";
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from "@/components/ui/Table";
import { SupplierManager } from "./SupplierManager";

export default async function SuppliersPage() {
  const user = await requirePermission(PERMISSIONS.SUPPLIERS_MANAGE);

  const [{ data: suppliers }, activityConfig] = await Promise.all([
    supabase.from("suppliers").select("id, name, company, phone, address").eq("business_id", user.businessId).order("name", { ascending: true }),
    getActivityConfig(user.business.activityKey),
  ]);
  const suppliersLabel = resolveTerm(activityConfig, "suppliers");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">{suppliersLabel}</h1>
          <p className="text-sm text-zinc-500">
            {(suppliers ?? []).length} {suppliersLabel.toLowerCase()}
          </p>
        </div>
        <SupplierManager mode="create-only" />
      </div>

      {(suppliers ?? []).length === 0 ? (
        <EmptyState title="Aucun fournisseur" description="Ajoutez votre premier fournisseur." />
      ) : (
        <Card className="overflow-x-auto">
          <Table className="min-w-[600px]">
            <TableHead>
              <TableRow interactive={false}>
                <TableHeaderCell>Nom</TableHeaderCell>
                <TableHeaderCell>Entreprise</TableHeaderCell>
                <TableHeaderCell>Téléphone</TableHeaderCell>
                <TableHeaderCell>Adresse</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(suppliers ?? []).map((s) => (
                <TableRow key={s.id as string}>
                  <TableCell>
                    <Link href={`/fournisseurs/${s.id}`} className="font-medium text-zinc-900 hover:text-emerald-600 dark:text-slate-100">
                      {s.name as string}
                    </Link>
                  </TableCell>
                  <TableCell className="text-zinc-600 dark:text-slate-400">{(s.company as string | null) ?? "—"}</TableCell>
                  <TableCell className="text-zinc-600 dark:text-slate-400">{(s.phone as string | null) ?? "—"}</TableCell>
                  <TableCell className="text-zinc-600 dark:text-slate-400">{(s.address as string | null) ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
