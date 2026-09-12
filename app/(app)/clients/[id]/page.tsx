import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { requirePermission, hasPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { formatMoney, formatDate } from "@/lib/format";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/Empty";
import { ClientEditButton } from "./ClientEditButton";
import { RecordPaymentButton } from "./RecordPaymentButton";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePermission(PERMISSIONS.CUSTOMERS_VIEW);
  // Le module "Ventes" est piloté par SALES_CREATE (même droit que le lien
  // "Vente / Caisse" du menu) : si un compte n'y a plus accès, aucune trace du
  // module ne doit apparaître ailleurs dans l'application, y compris ici.
  const [canManage, canSeeSales] = await Promise.all([
    hasPermission(user.businessId, user.role, PERMISSIONS.CUSTOMERS_MANAGE, user.id),
    hasPermission(user.businessId, user.role, PERMISSIONS.SALES_CREATE, user.id),
  ]);
  const { id } = await params;

  const customer = await prisma.customer.findFirst({ where: { id, businessId: user.businessId } });
  if (!customer) notFound();

  const [sales, payments] = await Promise.all([
    prisma.sale.findMany({
      where: { customerId: id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.customerPayment.findMany({
      where: { customerId: id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const currency = user.business.currency;
  const totalBought = sales.reduce((s, sale) => s + sale.total, 0);
  const creditBalance = sales
    .filter((s) => s.status !== "ANNULEE")
    .reduce((s, sale) => s + (sale.total - sale.amountPaid), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/clients" className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700">
            <ArrowLeft className="h-4 w-4" /> Retour aux clients
          </Link>
          <h1 className="mt-1 text-xl font-bold text-zinc-900">{customer.name}</h1>
          <p className="text-sm text-zinc-500">{customer.phone}</p>
        </div>
        {canManage && (
          <div className="flex gap-2">
            {creditBalance > 0 && <RecordPaymentButton customerId={customer.id} maxAmount={creditBalance} />}
            <ClientEditButton customer={customer} />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {canSeeSales && (
          <Card>
            <CardBody>
              <p className="text-sm text-zinc-500">Total acheté</p>
              <p className="mt-1 text-xl font-bold text-zinc-900">{formatMoney(totalBought, currency)}</p>
            </CardBody>
          </Card>
        )}
        <Card>
          <CardBody>
            <p className="text-sm text-zinc-500">Crédit restant</p>
            <p className={`mt-1 text-xl font-bold ${creditBalance > 0 ? "text-red-600" : "text-zinc-900"}`}>
              {formatMoney(creditBalance, currency)}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-sm text-zinc-500">Limite de crédit</p>
            <p className="mt-1 text-xl font-bold text-zinc-900">
              {customer.creditLimit > 0 ? formatMoney(customer.creditLimit, currency) : "Non définie"}
            </p>
          </CardBody>
        </Card>
      </div>

      {canSeeSales && (
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-zinc-900">Historique des achats</h2>
        </CardHeader>
        <CardBody className="p-0">
          {sales.length === 0 ? (
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
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {sales.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-2">
                      <Link href={`/ventes/${s.id}`} className="font-mono text-xs text-emerald-600 hover:underline">
                        {s.number}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-zinc-600">{formatDate(s.createdAt)}</td>
                    <td className="px-4 py-2">
                      <Badge tone={s.status === "PAYEE" ? "emerald" : s.status === "CREDIT" ? "red" : "amber"}>
                        {s.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-2 text-right text-zinc-900">{formatMoney(s.total, currency)}</td>
                    <td className="px-4 py-2 text-right text-zinc-600">{formatMoney(s.amountPaid, currency)}</td>
                    <td className="px-4 py-2 text-right">
                      <Link
                        href={`/ventes/${s.id}?print=1`}
                        title="Réimprimer le ticket"
                        className="inline-flex items-center gap-1 rounded-lg p-1.5 text-zinc-400 hover:bg-emerald-50 hover:text-emerald-700"
                      >
                        <Printer className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>
      )}

      {payments.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-zinc-900">Remboursements reçus</h2>
          </CardHeader>
          <CardBody className="space-y-2">
            {payments.map((p) => (
              <div key={p.id} className="flex justify-between text-sm">
                <span className="text-zinc-600">
                  {formatDate(p.createdAt)} · {p.method}
                  {p.note ? ` · ${p.note}` : ""}
                </span>
                <span className="font-medium text-emerald-600">{formatMoney(p.amount, currency)}</span>
              </div>
            ))}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
