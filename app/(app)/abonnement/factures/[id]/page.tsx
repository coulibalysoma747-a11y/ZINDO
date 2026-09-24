import { notFound } from "next/navigation";
import { requireUserForBilling } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { FactureInvoiceView } from "./FactureInvoiceView";

const CYCLE_LABELS = { MONTHLY: "Mensuel", ANNUAL: "Annuel" } as const;
const STATUS_LABELS = { EN_ATTENTE: "En attente", PAYEE: "Payée", ANNULEE: "Annulée" } as const;

type InvoiceRow = {
  id: string;
  number: string;
  planLabel: string;
  billingCycle: keyof typeof CYCLE_LABELS;
  amount: number;
  status: keyof typeof STATUS_LABELS;
  paymentMethod: string | null;
  paymentReference: string | null;
  createdAt: string;
  paidAt: string | null;
  payerLastName: string | null;
  payerFirstName: string | null;
  payerPhone: string | null;
};

export default async function SubscriptionInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUserForBilling();

  const { data } = await supabase
    .from("subscription_invoices")
    .select(
      "id, number, planLabel:plan_label, billingCycle:billing_cycle, amount, status, paymentMethod:payment_method, paymentReference:payment_reference, createdAt:created_at, paidAt:paid_at, payerLastName:payer_last_name, payerFirstName:payer_first_name, payerPhone:payer_phone"
    )
    .eq("id", id)
    .eq("business_id", user.businessId)
    .maybeSingle();
  if (!data) notFound();

  const invoice = data as unknown as InvoiceRow;
  const currency = user.business.currency;

  return (
    <FactureInvoiceView
      invoice={invoice}
      business={{ name: user.business.name, phone: user.business.phone, address: user.business.address, city: user.business.city, country: user.business.country }}
      cycleLabel={CYCLE_LABELS[invoice.billingCycle]}
      statusLabel={STATUS_LABELS[invoice.status]}
      currency={currency}
    />
  );
}
