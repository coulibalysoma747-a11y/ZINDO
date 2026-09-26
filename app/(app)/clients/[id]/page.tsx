import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileText, Printer } from "lucide-react";
import { requirePermission, hasPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { formatMoney, formatDate } from "@/lib/format";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/Empty";
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from "@/components/ui/Table";
import { ClientEditButton } from "./ClientEditButton";
import { RecordPaymentButton } from "./RecordPaymentButton";
import { DebtExemptionToggle } from "./DebtExemptionToggle";
import { isDebtExemptionEnabled } from "@/lib/debt-exemption";
import { getBusinessSettings } from "@/lib/business-settings";
import { groupPayments, isClientDocumentsEnabled } from "@/lib/client-documents";
import { ButtonLink } from "@/components/ui/Button";

type CustomerRow = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  creditLimit: number;
};

type SaleRow = { id: string; number: string; createdAt: string; status: string; total: number; amountPaid: number };

const STATUS_LABELS: Record<string, string> = {
  PAYEE: "Payée",
  PARTIELLE: "Partielle",
  CREDIT: "Crédit",
  ANNULEE: "Annulée",
};
type PaymentRow = { id: string; createdAt: string; method: string; note: string | null; amount: number; saleId: string | null };

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePermission(PERMISSIONS.CUSTOMERS_VIEW);
  // Le module "Ventes" est piloté par SALES_CREATE (même droit que le lien
  // "Vente / Caisse" du menu) : si un compte n'y a plus accès, aucune trace du
  // module ne doit apparaître ailleurs dans l'application, y compris ici.
  const [canManage, canSeeSales, canManageSettings, debtExemptionEnabled, businessSettings, clientDocuments] = await Promise.all([
    hasPermission(user.businessId, user.role, PERMISSIONS.CUSTOMERS_MANAGE, user.id),
    hasPermission(user.businessId, user.role, PERMISSIONS.SALES_CREATE, user.id),
    hasPermission(user.businessId, user.role, PERMISSIONS.SETTINGS_MANAGE, user.id),
    isDebtExemptionEnabled(user.businessId),
    getBusinessSettings(user.businessId),
    isClientDocumentsEnabled(user.businessId),
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
      .select("id, createdAt:created_at, method, note, amount, saleId:sale_id")
      .eq("customer_id", id)
      .order("created_at", { ascending: false }),
  ]);
  const sales = (salesData ?? []) as unknown as SaleRow[];
  const paymentRows = (paymentsData ?? []) as unknown as PaymentRow[];
  // Avec le flag « documents_client_pdf », un remboursement réparti sur
  // plusieurs ventes s'affiche sur une seule ligne, avec son reçu.
  const payments = clientDocuments ? groupPayments(paymentRows) : paymentRows;

  const currency = user.business.currency;
  // Les ventes annulées ne comptent ni dans le total acheté ni dans la dette ;
  // la monnaie rendue (payé > total) ne réduit pas la dette des autres ventes.
  const activeSales = sales.filter((s) => s.status !== "ANNULEE");
  const totalBought = activeSales.reduce((s, sale) => s + sale.total, 0);
  const creditBalance = activeSales.reduce((s, sale) => s + Math.max(0, sale.total - sale.amountPaid), 0);

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
        {(canManage || (clientDocuments && canSeeSales)) && (
          <div className="flex flex-wrap gap-2">
            {clientDocuments && canSeeSales && (
              <ButtonLink href={`/clients/${customer.id}/releve`} variant="outline">
                <FileText className="h-4 w-4" /> Relevé PDF
              </ButtonLink>
            )}
            {canManage && creditBalance > 0 && (
              <RecordPaymentButton customerId={customer.id} maxAmount={creditBalance} receiptEnabled={clientDocuments} />
            )}
            {canManage && <ClientEditButton customer={customer} />}
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

      {debtExemptionEnabled && canManageSettings && businessSettings.blockSaleIfCustomerDebt && (
        <DebtExemptionToggle
          customerId={customer.id}
          initialExempt={businessSettings.debtBlockExemptCustomerIds.includes(customer.id)}
        />
      )}

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
              <div className="overflow-x-auto">
                <Table className="min-w-[560px]">
                  <TableHead>
                    <tr>
                      <TableHeaderCell>N°</TableHeaderCell>
                      <TableHeaderCell>Date</TableHeaderCell>
                      <TableHeaderCell>Statut</TableHeaderCell>
                      <TableHeaderCell align="right">Total</TableHeaderCell>
                      <TableHeaderCell align="right">Payé</TableHeaderCell>
                      <TableHeaderCell />
                    </tr>
                  </TableHead>
                  <TableBody>
                    {sales.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell>
                          <Link href={`/ventes/${s.id}`} className="font-mono text-xs text-emerald-600 hover:underline">
                            {s.number}
                          </Link>
                        </TableCell>
                        <TableCell className="text-zinc-600 dark:text-slate-400">{formatDate(new Date(s.createdAt))}</TableCell>
                        <TableCell>
                          <Badge tone={s.status === "PAYEE" ? "emerald" : s.status === "CREDIT" ? "red" : "amber"}>
                            {STATUS_LABELS[s.status] ?? s.status}
                          </Badge>
                        </TableCell>
                        <TableCell align="right" className="tabular-nums text-zinc-900 dark:text-slate-100">
                          {formatMoney(s.total, currency)}
                        </TableCell>
                        <TableCell align="right" className="tabular-nums text-zinc-600 dark:text-slate-400">
                          {formatMoney(s.amountPaid, currency)}
                        </TableCell>
                        <TableCell align="right">
                          <Link
                            href={`/ventes/${s.id}?print=1`}
                            title="Réimprimer le ticket"
                            className="inline-flex items-center gap-1 rounded-lg p-1.5 text-zinc-400 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-900/30"
                          >
                            <Printer className="h-4 w-4" />
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
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
              <div key={p.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="text-zinc-600">
                  {formatDate(new Date(p.createdAt))} · {p.method}
                  {p.note ? ` · ${p.note}` : ""}
                </span>
                <span className="flex items-center gap-1">
                  <span className="font-medium text-emerald-600">{formatMoney(p.amount, currency)}</span>
                  {clientDocuments && (
                    <Link
                      href={`/clients/${customer.id}/recu/${p.id}`}
                      title="Imprimer le reçu"
                      className="inline-flex items-center rounded-lg p-1.5 text-zinc-400 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-900/30"
                    >
                      <Printer className="h-4 w-4" />
                    </Link>
                  )}
                </span>
              </div>
            ))}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
