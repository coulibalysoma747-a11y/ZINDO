import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { formatDate, formatMoney, amountInWords } from "@/lib/format";
import { PAYMENT_METHOD_LABELS } from "@/lib/payment-method-labels";
import { isDocumentEnabled, loadDocBusiness, printedByName, resolvePeriod } from "@/lib/documents";
import { isZindoMentionEnabled } from "@/lib/zindo-mention";
import { A4Document, DocSection, DocTable } from "@/components/documents/A4Document";
import { DocToolbar, PeriodPicker } from "@/components/documents/DocToolbar";

const STATUS_LABELS: Record<string, string> = { RECUE: "Reçue", PARTIELLE: "Partielle", COMMANDEE: "Commandée" };

type PurchaseRow = { id: string; number: string; createdAt: string; status: string; total: number; amountPaid: number };
type PaymentRow = { id: string; createdAt: string; method: string; amount: number };

/** Relevé fournisseur A4 (flag « pdf_releve_fournisseur ») : même calcul de dette que la fiche fournisseur. */
export default async function SupplierStatementPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ periode?: string; du?: string; au?: string }>;
}) {
  const user = await requirePermission(PERMISSIONS.SUPPLIERS_MANAGE);
  if (!(await isDocumentEnabled("pdf_releve_fournisseur", user.businessId))) notFound();
  const { id } = await params;
  const sp = await searchParams;
  const period = resolvePeriod(sp);

  const [business, zindoMention, { data: supplier }] = await Promise.all([
    loadDocBusiness(user.businessId),
    isZindoMentionEnabled(user.businessId),
    supabase.from("suppliers").select("id, name, company, phone, address").eq("id", id).eq("business_id", user.businessId).maybeSingle(),
  ]);
  if (!business || !supplier) notFound();

  const [{ data: purchasesData }, { data: paymentsData }] = await Promise.all([
    supabase
      .from("purchases")
      .select("id, number, createdAt:created_at, status, total, amountPaid:amount_paid")
      .eq("supplier_id", id)
      .eq("business_id", user.businessId)
      .order("created_at", { ascending: true }),
    supabase.from("supplier_payments").select("id, createdAt:created_at, method, amount").eq("supplier_id", id).order("created_at", { ascending: true }),
  ]);
  const allPurchases = (purchasesData ?? []) as unknown as PurchaseRow[];
  const inPeriod = (iso: string) => {
    const t = new Date(iso).getTime();
    return (!period.from || t >= period.from.getTime()) && (!period.to || t < period.to.getTime());
  };
  const purchases = allPurchases.filter((p) => inPeriod(p.createdAt));
  const payments = ((paymentsData ?? []) as unknown as PaymentRow[]).filter((p) => inPeriod(p.createdAt));

  const debt = allPurchases.reduce((s, p) => s + p.total - p.amountPaid, 0);
  const total = purchases.reduce((s, p) => s + p.total, 0);
  const paid = purchases.reduce((s, p) => s + p.amountPaid, 0);
  const money = (v: number) => formatMoney(v, business.currency);

  return (
    <div>
      <DocToolbar backHref={`/fournisseurs/${id}`} backLabel="Retour à la fiche fournisseur">
        <PeriodPicker basePath={`/fournisseurs/${id}/releve`} current={sp} />
      </DocToolbar>
      <A4Document
        business={business}
        title="RELEVÉ FOURNISSEUR"
        meta={[period.label]}
        party={{
          label: "Fournisseur",
          name: (supplier.company as string | null) || (supplier.name as string),
          lines: [
            supplier.company ? (supplier.name as string) : null,
            supplier.address as string | null,
            supplier.phone ? `Tél : ${supplier.phone}` : null,
          ],
        }}
        stats={[
          { label: "Total des achats", value: money(total) },
          { label: "Déjà payé", value: money(paid) },
          { label: "Reste à payer à ce jour", value: money(debt), strong: true },
        ]}
        printedAt={new Date()}
        printedBy={printedByName(user)}
        zindoMention={zindoMention}
        signatures={[
          { label: "Le commerçant", name: business.signerName || business.name },
          { label: "Le fournisseur (bon pour accord)" },
        ]}
      >
        <DocSection title="Achats">
          <DocTable
            empty="Aucun achat sur cette période."
            columns={[
              { label: "Date" },
              { label: "N° d'achat" },
              { label: "Statut" },
              { label: "Montant", align: "right" },
              { label: "Payé", align: "right" },
              { label: "Reste", align: "right" },
            ]}
            rows={[
              ...purchases.map((p) => ({
                key: p.id,
                cells: [
                  formatDate(new Date(p.createdAt)),
                  <span key="n" className="font-mono">{p.number}</span>,
                  STATUS_LABELS[p.status] ?? p.status,
                  money(p.total),
                  money(p.amountPaid),
                  p.total - p.amountPaid > 0 ? <span key="r" className="font-bold">{money(p.total - p.amountPaid)}</span> : "—",
                ],
              })),
              ...(purchases.length ? [{ cells: ["", "Total", "", money(total), money(paid), money(total - paid)], bold: true }] : []),
            ]}
          />
        </DocSection>
        {payments.length > 0 && (
          <DocSection title="Paiements effectués">
            <DocTable
              columns={[{ label: "Date" }, { label: "Moyen de paiement" }, { label: "Montant", align: "right" }]}
              rows={payments.map((p) => ({
                key: p.id,
                cells: [formatDate(new Date(p.createdAt)), PAYMENT_METHOD_LABELS[p.method] ?? p.method, money(p.amount)],
              }))}
            />
          </DocSection>
        )}
        <div className="mt-6 break-inside-avoid border-t-2 border-zinc-900 pt-3 text-xs">
          {debt > 0 ? (
            <>
              <p className="text-sm">
                Reste à payer à ce jour : <span className="font-extrabold">{money(debt)}</span>
              </p>
              <p className="mt-1 italic">
                Arrêté à la somme de : {amountInWords(debt, business.currency)}.
              </p>
            </>
          ) : (
            <p className="text-sm font-bold">Compte soldé : aucune somme due au fournisseur à ce jour.</p>
          )}
        </div>
      </A4Document>
    </div>
  );
}
