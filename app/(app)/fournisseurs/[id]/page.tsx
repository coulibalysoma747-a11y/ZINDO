import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { formatMoney, formatDate } from "@/lib/format";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/Empty";
import { Badge } from "@/components/ui/Badge";
import { SupplierEditButton } from "./SupplierEditButton";

export default async function SupplierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePermission(PERMISSIONS.SUPPLIERS_MANAGE);
  const { id } = await params;

  const supplier = await prisma.supplier.findFirst({ where: { id, businessId: user.businessId } });
  if (!supplier) notFound();

  const [purchases, payments, products] = await Promise.all([
    prisma.purchase.findMany({ where: { supplierId: id }, orderBy: { createdAt: "desc" } }),
    prisma.supplierPayment.findMany({ where: { supplierId: id }, orderBy: { createdAt: "desc" } }),
    prisma.product.findMany({ where: { supplierId: id }, select: { id: true, name: true } }),
  ]);

  const currency = user.business.currency;
  const totalPurchased = purchases.reduce((s, p) => s + p.total, 0);
  const totalPaid = purchases.reduce((s, p) => s + p.amountPaid, 0);
  const debt = totalPurchased - totalPaid;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/fournisseurs" className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700">
            <ArrowLeft className="h-4 w-4" /> Retour aux fournisseurs
          </Link>
          <h1 className="mt-1 text-xl font-bold text-zinc-900">{supplier.name}</h1>
          {supplier.company && <p className="text-sm text-zinc-500">{supplier.company}</p>}
        </div>
        <SupplierEditButton supplier={supplier} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardBody>
            <p className="text-sm text-zinc-500">Total des achats</p>
            <p className="mt-1 text-xl font-bold text-zinc-900">{formatMoney(totalPurchased, currency)}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-sm text-zinc-500">Montant payé</p>
            <p className="mt-1 text-xl font-bold text-emerald-600">{formatMoney(totalPaid, currency)}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-sm text-zinc-500">Dette restante</p>
            <p className={`mt-1 text-xl font-bold ${debt > 0 ? "text-red-600" : "text-zinc-900"}`}>
              {formatMoney(debt, currency)}
            </p>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-zinc-900">Coordonnées</h2>
        </CardHeader>
        <CardBody className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          <div>
            <p className="text-zinc-400">Téléphone</p>
            <p className="font-medium text-zinc-900">{supplier.phone ?? "—"}</p>
          </div>
          <div>
            <p className="text-zinc-400">E-mail</p>
            <p className="font-medium text-zinc-900">{supplier.email ?? "—"}</p>
          </div>
          <div>
            <p className="text-zinc-400">Adresse</p>
            <p className="font-medium text-zinc-900">{supplier.address ?? "—"}</p>
          </div>
          <div className="col-span-full">
            <p className="text-zinc-400">Produits fournis</p>
            <p className="font-medium text-zinc-900">
              {products.length === 0 ? "—" : products.map((p) => p.name).join(", ")}
            </p>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-zinc-900">Historique des achats</h2>
        </CardHeader>
        <CardBody className="p-0">
          {purchases.length === 0 ? (
            <div className="p-5">
              <EmptyState title="Aucun achat enregistré" />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-left text-zinc-500">
                <tr>
                  <th className="px-4 py-2 font-medium">N°</th>
                  <th className="px-4 py-2 font-medium">Date</th>
                  <th className="px-4 py-2 font-medium">Statut</th>
                  <th className="px-4 py-2 text-right font-medium">Total</th>
                  <th className="px-4 py-2 text-right font-medium">Payé</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {purchases.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-2">
                      <Link href={`/achats/${p.id}`} className="font-mono text-xs text-emerald-600 hover:underline">
                        {p.number}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-zinc-600">{formatDate(p.createdAt)}</td>
                    <td className="px-4 py-2">
                      <Badge tone={p.status === "RECUE" ? "emerald" : "amber"}>{p.status}</Badge>
                    </td>
                    <td className="px-4 py-2 text-right text-zinc-900">{formatMoney(p.total, currency)}</td>
                    <td className="px-4 py-2 text-right text-zinc-600">{formatMoney(p.amountPaid, currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>

      {payments.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-zinc-900">Paiements effectués</h2>
          </CardHeader>
          <CardBody className="space-y-2">
            {payments.map((p) => (
              <div key={p.id} className="flex justify-between text-sm">
                <span className="text-zinc-600">{formatDate(p.createdAt)} · {p.method}</span>
                <span className="font-medium text-zinc-900">{formatMoney(p.amount, currency)}</span>
              </div>
            ))}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
