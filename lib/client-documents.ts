import "server-only";
import { supabase } from "@/lib/supabase";
import { isFeatureEnabled, registerFeatureFlag } from "@/lib/feature-flags";
import { getInvoiceCustomization, type InvoiceCustomization } from "@/lib/invoice-customization";

const CLIENT_DOCUMENTS_FLAG = "documents_client_pdf";

/** Flag « documents_client_pdf » : relevé de compte client (A4) et reçu de remboursement (ticket). */
export async function isClientDocumentsEnabled(businessId: string): Promise<boolean> {
  await registerFeatureFlag(
    CLIENT_DOCUMENTS_FLAG,
    "Relevé client et reçu de remboursement",
    "Sur la fiche client : un relevé de compte A4 (achats, remboursements, reste dû) à imprimer ou enregistrer en PDF, et un reçu imprimable pour chaque remboursement encaissé."
  );
  return isFeatureEnabled(CLIENT_DOCUMENTS_FLAG, businessId);
}

export type DocBusiness = {
  name: string;
  logoUrl: string | null;
  address: string | null;
  city: string | null;
  phone: string | null;
  currency: string;
};

type Customer = { id: string; name: string; phone: string | null; address: string | null };
type SaleRow = { id: string; number: string; createdAt: string; status: string; total: number; amountPaid: number };
type PaymentRow = { id: string; createdAt: string; method: string; note: string | null; amount: number; saleId: string | null };

/**
 * Un remboursement saisi une fois est enregistré en une ligne par vente
 * soldée (recordCustomerPaymentAction), toutes insérées ensemble : elles
 * partagent donc le même created_at. On les regroupe pour afficher un seul
 * remboursement, avec le détail des ventes concernées.
 */
export type GroupedPayment = {
  /** Identifiant de la première ligne : sert d'adresse au reçu. */
  id: string;
  createdAt: string;
  method: string;
  note: string | null;
  amount: number;
  saleIds: string[];
  /** Toutes les lignes du remboursement : le reçu s'ouvre depuis n'importe laquelle. */
  rowIds: string[];
};

export function groupPayments(rows: PaymentRow[]): GroupedPayment[] {
  const groups = new Map<string, GroupedPayment>();
  for (const p of rows) {
    const key = `${new Date(p.createdAt).getTime()}|${p.method}`;
    const group = groups.get(key);
    if (group) {
      group.amount = Math.round((group.amount + p.amount) * 100) / 100;
      if (p.saleId) group.saleIds.push(p.saleId);
      group.rowIds.push(p.id);
    } else {
      groups.set(key, {
        id: p.id,
        createdAt: p.createdAt,
        method: p.method,
        note: p.note,
        amount: p.amount,
        saleIds: p.saleId ? [p.saleId] : [],
        rowIds: [p.id],
      });
    }
  }
  return [...groups.values()];
}

/** Dette actuelle : même calcul que la fiche client (ventes annulées exclues, monnaie rendue ignorée). */
function debtOf(sales: SaleRow[]) {
  return sales
    .filter((s) => s.status !== "ANNULEE")
    .reduce((sum, s) => sum + Math.max(0, s.total - s.amountPaid), 0);
}

async function loadBusiness(businessId: string): Promise<DocBusiness | null> {
  const { data } = await supabase
    .from("businesses")
    .select("name, logoUrl:logo_url, address, city, phone, currency")
    .eq("id", businessId)
    .maybeSingle();
  return (data as unknown as DocBusiness) ?? null;
}

async function loadCustomer(customerId: string, businessId: string): Promise<Customer | null> {
  const { data } = await supabase
    .from("customers")
    .select("id, name, phone, address")
    .eq("id", customerId)
    .eq("business_id", businessId)
    .maybeSingle();
  return (data as unknown as Customer) ?? null;
}

async function loadSales(customerId: string, businessId: string): Promise<SaleRow[]> {
  const { data } = await supabase
    .from("sales")
    .select("id, number, createdAt:created_at, status, total, amountPaid:amount_paid")
    .eq("business_id", businessId)
    .eq("customer_id", customerId)
    .order("created_at", { ascending: true });
  return (data ?? []) as unknown as SaleRow[];
}

async function loadPayments(customerId: string): Promise<PaymentRow[]> {
  const { data } = await supabase
    .from("customer_payments")
    .select("id, createdAt:created_at, method, note, amount, saleId:sale_id")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });
  return (data ?? []) as unknown as PaymentRow[];
}

// ---------------------------------------------------------------------------
// Relevé de compte
// ---------------------------------------------------------------------------

export type StatementData = {
  business: DocBusiness;
  custom: InvoiceCustomization;
  customer: Customer;
  /** Bornes incluses, au format AAAA-MM-JJ ; null = depuis le début / jusqu'à aujourd'hui. */
  from: string | null;
  to: string | null;
  unpaidOnly: boolean;
  sales: (SaleRow & { remaining: number })[];
  payments: GroupedPayment[];
  totalBought: number;
  totalPaid: number;
  totalRemainingInPeriod: number;
  /** Reste dû à ce jour, toutes périodes confondues. */
  currentDebt: number;
  printedAt: string;
  printedBy: string;
};

function inPeriod(iso: string, from: string | null, to: string | null) {
  const day = iso.slice(0, 10);
  return (!from || day >= from) && (!to || day <= to);
}

export async function loadCustomerStatement(
  customerId: string,
  businessId: string,
  options: { from: string | null; to: string | null; unpaidOnly: boolean; printedBy: string }
): Promise<StatementData | null> {
  const [business, customer] = await Promise.all([loadBusiness(businessId), loadCustomer(customerId, businessId)]);
  if (!business || !customer) return null;
  const [allSales, paymentRows, custom] = await Promise.all([
    loadSales(customerId, businessId),
    loadPayments(customerId),
    getInvoiceCustomization(businessId),
  ]);

  const { from, to, unpaidOnly } = options;
  const sales = allSales
    .filter((s) => s.status !== "ANNULEE" && inPeriod(s.createdAt, from, to))
    .map((s) => ({ ...s, remaining: Math.max(0, s.total - s.amountPaid) }))
    .filter((s) => !unpaidOnly || s.remaining > 0);
  const payments = unpaidOnly ? [] : groupPayments(paymentRows.filter((p) => inPeriod(p.createdAt, from, to)));

  return {
    business,
    custom,
    customer,
    from,
    to,
    unpaidOnly,
    sales,
    payments,
    totalBought: sales.reduce((sum, s) => sum + s.total, 0),
    totalPaid: sales.reduce((sum, s) => sum + Math.min(s.total, s.amountPaid), 0),
    totalRemainingInPeriod: sales.reduce((sum, s) => sum + s.remaining, 0),
    currentDebt: debtOf(allSales),
    printedAt: new Date().toISOString(),
    printedBy: options.printedBy,
  };
}

// ---------------------------------------------------------------------------
// Reçu de remboursement
// ---------------------------------------------------------------------------

export type PaymentReceiptData = {
  business: DocBusiness;
  customer: Customer;
  receiptNumber: string;
  payment: GroupedPayment;
  /** Ventes sur lesquelles le remboursement a été imputé. */
  allocations: { number: string; amount: number }[];
  cashierName: string | null;
  currentDebt: number;
  printedAt: string;
  footerMessage: string | null;
};

export async function loadPaymentReceipt(
  customerId: string,
  paymentId: string,
  businessId: string
): Promise<PaymentReceiptData | null> {
  const [business, customer] = await Promise.all([loadBusiness(businessId), loadCustomer(customerId, businessId)]);
  if (!business || !customer) return null;

  const [paymentRows, sales] = await Promise.all([loadPayments(customerId), loadSales(customerId, businessId)]);
  const payment = groupPayments(paymentRows).find((g) => g.rowIds.includes(paymentId));
  if (!payment) return null;

  const groupRows = paymentRows.filter((p) => payment.rowIds.includes(p.id));
  const saleNumbers = new Map(sales.map((s) => [s.id, s.number]));
  const allocations = groupRows
    .filter((p) => p.saleId)
    .map((p) => ({ number: saleNumbers.get(p.saleId as string) ?? "—", amount: p.amount }));

  const [{ data: paymentUser }, { data: footer }] = await Promise.all([
    supabase
      .from("customer_payments")
      .select("user:users(firstName:first_name, lastName:last_name)")
      .eq("id", paymentId)
      .maybeSingle(),
    supabase.from("businesses").select("ticketFooter:ticket_footer").eq("id", businessId).maybeSingle(),
  ]);
  const u = (paymentUser as unknown as { user: { firstName: string; lastName: string } | null } | null)?.user;

  return {
    business,
    customer,
    receiptNumber: `RB-${payment.id.replace(/-/g, "").slice(0, 8).toUpperCase()}`,
    payment,
    allocations,
    cashierName: u ? `${u.firstName} ${u.lastName}`.trim() : null,
    currentDebt: debtOf(sales),
    printedAt: new Date().toISOString(),
    footerMessage: (footer as unknown as { ticketFooter: string | null } | null)?.ticketFooter ?? null,
  };
}
