import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { formatDateTime } from "@/lib/format";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";

type TransferRow = {
  id: string;
  number: string;
  createdAt: string;
  note: string | null;
  fromLocationId: string;
  toLocationId: string;
  user: { firstName: string; lastName: string };
  items: Array<{ id: string; quantity: number; product: { name: string; unit: string } }>;
};

export default async function TransferDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePermission(PERMISSIONS.TRANSFERS_MANAGE);
  const { id } = await params;

  const { data } = await supabase
    .from("stock_transfers")
    .select(
      "id, number, createdAt:created_at, note, fromLocationId:from_location_id, toLocationId:to_location_id, user:users(firstName:first_name, lastName:last_name), " +
        "items:stock_transfer_items(id, quantity, product:products(name, unit))"
    )
    .eq("id", id)
    .eq("business_id", user.businessId)
    .maybeSingle();
  if (!data) notFound();
  const transfer = data as unknown as TransferRow;

  const { data: locations } = await supabase
    .from("locations")
    .select("id, name")
    .in("id", [transfer.fromLocationId, transfer.toLocationId]);
  const locationNames = new Map((locations ?? []).map((l) => [l.id as string, l.name as string]));

  return (
    <div className="space-y-6">
      <div>
        <Link href="/transferts" className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700">
          <ArrowLeft className="h-4 w-4" /> Retour aux transferts
        </Link>
        <h1 className="mt-1 text-xl font-bold text-zinc-900">Transfert {transfer.number}</h1>
        <p className="flex items-center gap-1.5 text-sm text-zinc-500">
          {locationNames.get(transfer.fromLocationId) ?? "—"} <ArrowRight className="h-3.5 w-3.5 text-zinc-400" />{" "}
          {locationNames.get(transfer.toLocationId) ?? "—"}
          {" · "}
          {formatDateTime(new Date(transfer.createdAt))} · par {transfer.user.firstName} {transfer.user.lastName}
        </p>
        {transfer.note && <p className="mt-1 text-sm text-zinc-500">Note : {transfer.note}</p>}
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-zinc-900">Produits transférés</h2>
        </CardHeader>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-left text-zinc-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Produit</th>
                  <th className="px-4 py-2 text-right font-medium">Quantité</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {transfer.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-2 font-medium text-zinc-900">{item.product.name}</td>
                    <td className="px-4 py-2 text-right text-zinc-700">
                      {item.quantity} {item.product.unit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
