import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { requirePermission, hasPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { formatMoney, formatDate } from "@/lib/format";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/Empty";
import { ClientEditButton } from "./ClientEditButton";
import { RecordPaymentButton } from "./RecordPaymentButton";

type CustomerRow = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  creditLimit: number;
};

type SaleRow = { id: string; number: string; createdAt: string; status: string; total: number; amountPaid: number };
type PaymentRow = { id: string; createdAt: string; method: string; note: string | null; amount: number };

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

  const { data: customerRow } = await supabase
    .from("customers")
    .select("id, name, phone, email, address, creditLimit:credit_limit")
    .eq("id", id)
    .eq("business_id", user.businessId)
    .maybeSingle();
  if (!customerRow) notFound();
  const customer = customerRow as unknown as CustomerRow;

  const [{ data: salesData }, { data: paymentsData }] = await Promise.all([
    supabase
      .from("sales")
      .select("id, number, createdAt:created_at, status, total, amountPaid:amount_paid")
      .eq("customer_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("customer_payments")
      .select("id, createdAt:created_at, method, note, amount")
      .eq("customer_id", id)
      .order("created_at", { ascending: false }),
  ]);
  const sales = (salesData ?? []) as unknown as SaleRow[];
  const payments = (paymentsData ?? []) as unknown as PaymentRow[];

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
                      <td className="px-4 py-2 text-zinc-600">{formatDate(new Date(s.createdAt))}</td>
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
                  {formatDate(new Date(p.createdAt))} · {p.method}
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
