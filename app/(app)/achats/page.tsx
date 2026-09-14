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
          <table className="w-full min-w-[700px] text-sm">
            <thead className="bg-zinc-50 text-left text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">N°</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Boutique</th>
                <th className="px-4 py-3 font-medium">Fournisseur</th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3 text-right font-medium">Total</th>
                <th className="px-4 py-3 text-right font-medium">Payé</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {purchases.map((p) => (
                <tr key={p.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3">
                    <Link href={`/achats/${p.id}`} className="font-mono text-xs text-emerald-600 hover:underline">
                      {p.number}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-600">{formatDateTime(new Date(p.createdAt))}</td>
                  <td className="px-4 py-3 text-zinc-600">{p.location.name}</td>
                  <td className="px-4 py-3 text-zinc-600">{p.supplier.name}</td>
                  <td className="px-4 py-3">
                    <Badge tone={p.status === "RECUE" ? "emerald" : p.status === "PARTIELLE" ? "amber" : "zinc"}>
                      {p.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-zinc-900">{formatMoney(p.total, currency)}</td>
                  <td className="px-4 py-3 text-right text-zinc-600">{formatMoney(p.amountPaid, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
