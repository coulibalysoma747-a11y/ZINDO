import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { formatMoney, formatDateTime } from "@/lib/format";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from "@/components/ui/Table";

type PurchaseRow = {
  id: string;
  number: string;
  createdAt: string;
  status: string;
  total: number;
  amountPaid: number;
  location: { name: string };
  supplier: { id: string; name: string };
  items: Array<{ id: string; quantity: number; unitPrice: number; total: number; product: { name: string } }>;
};

export default async function PurchaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePermission(PERMISSIONS.PURCHASES_MANAGE);
  const { id } = await params;

  const { data } = await supabase
    .from("purchases")
    .select(
      "id, number, createdAt:created_at, status, total, amountPaid:amount_paid, location:locations(name), supplier:suppliers(id, name), " +
        "items:purchase_items(id, quantity, unitPrice:unit_price, total, product:products(name))"
    )
    .eq("id", id)
    .eq("business_id", user.businessId)
    .maybeSingle();
  if (!data) notFound();
  const purchase = data as unknown as PurchaseRow;

  const currency = user.business.currency;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/achats" className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700">
          <ArrowLeft className="h-4 w-4" /> Retour aux achats
        </Link>
        <div className="mt-1 flex items-center gap-3">
          <h1 className="text-xl font-bold text-zinc-900">Achat {purchase.number}</h1>
          <Badge tone={purchase.status === "RECUE" ? "emerald" : purchase.status === "PARTIELLE" ? "amber" : "zinc"}>
            {purchase.status}
          </Badge>
        </div>
        <p className="text-sm text-zinc-500">
          {purchase.location.name} · {formatDateTime(new Date(purchase.createdAt))} · Fournisseur :{" "}
          <Link href={`/fournisseurs/${purchase.supplier.id}`} className="text-emerald-600 hover:underline">
            {purchase.supplier.name}
          </Link>
        </p>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-zinc-900">Produits reçus</h2>
        </CardHeader>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <Table className="min-w-[420px]">
              <TableHead>
                <tr>
                  <TableHeaderCell>Produit</TableHeaderCell>
                  <TableHeaderCell align="right">Quantité</TableHeaderCell>
                  <TableHeaderCell align="right">Prix d&apos;achat</TableHeaderCell>
                  <TableHeaderCell align="right">Total</TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {purchase.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium text-zinc-900 dark:text-slate-100">{item.product.name}</TableCell>
                    <TableCell align="right" className="tabular-nums text-zinc-700 dark:text-slate-300">{item.quantity}</TableCell>
                    <TableCell align="right" className="tabular-nums text-zinc-700 dark:text-slate-300">
                      {formatMoney(item.unitPrice, currency)}
                    </TableCell>
                    <TableCell align="right" className="font-medium tabular-nums text-zinc-900 dark:text-slate-100">
                      {formatMoney(item.total, currency)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardBody>
            <p className="text-sm text-zinc-500">Total de l&apos;achat</p>
            <p className="mt-1 text-xl font-bold text-zinc-900">{formatMoney(purchase.total, currency)}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-sm text-zinc-500">Montant payé</p>
            <p className="mt-1 text-xl font-bold text-emerald-600">{formatMoney(purchase.amountPaid, currency)}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-sm text-zinc-500">Reste à payer</p>
            <p className="mt-1 text-xl font-bold text-red-600">
              {formatMoney(purchase.total - purchase.amountPaid, currency)}
            </p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
