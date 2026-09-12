import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { formatMoney, formatDateTime } from "@/lib/format";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default async function PurchaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePermission(PERMISSIONS.PURCHASES_MANAGE);
  const { id } = await params;

  const purchase = await prisma.purchase.findFirst({
    where: { id, businessId: user.businessId },
    include: { items: { include: { product: true } }, supplier: true, user: true, location: true },
  });
  if (!purchase) notFound();

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
          {purchase.location.name} · {formatDateTime(purchase.createdAt)} · Fournisseur :{" "}
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
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-left text-zinc-500">
              <tr>
                <th className="px-4 py-2 font-medium">Produit</th>
                <th className="px-4 py-2 text-right font-medium">Quantité</th>
                <th className="px-4 py-2 text-right font-medium">Prix d&apos;achat</th>
                <th className="px-4 py-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {purchase.items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-2 font-medium text-zinc-900">{item.product.name}</td>
                  <td className="px-4 py-2 text-right text-zinc-700">{item.quantity}</td>
                  <td className="px-4 py-2 text-right text-zinc-700">{formatMoney(item.unitPrice, currency)}</td>
                  <td className="px-4 py-2 text-right font-medium text-zinc-900">
                    {formatMoney(item.total, currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
