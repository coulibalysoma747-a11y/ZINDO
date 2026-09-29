import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { formatDateTime, formatMoney, amountInWords } from "@/lib/format";
import { isDocumentEnabled, loadDocBusiness, printedByName } from "@/lib/documents";
import { isZindoMentionEnabled } from "@/lib/zindo-mention";
import { A4Document, DocSection, DocTable } from "@/components/documents/A4Document";
import { DocToolbar } from "@/components/documents/DocToolbar";

type PurchaseRow = {
  id: string;
  number: string;
  createdAt: string;
  status: string;
  total: number;
  amountPaid: number;
  location: { name: string };
  supplier: { name: string; company: string | null; phone: string | null; address: string | null };
  user: { firstName: string; lastName: string } | null;
  items: Array<{ id: string; quantity: number; unitPrice: number; total: number; product: { name: string; reference: string; unit: string } }>;
};

/** Bon de réception A4 (flag « pdf_bon_reception ») d'un achat enregistré. */
export default async function PurchaseReceiptDocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission(PERMISSIONS.PURCHASES_MANAGE);
  if (!(await isDocumentEnabled("pdf_bon_reception", user.businessId))) notFound();
  const { id } = await params;

  const [business, zindoMention, { data }] = await Promise.all([
    loadDocBusiness(user.businessId),
    isZindoMentionEnabled(user.businessId),
    supabase
      .from("purchases")
      .select(
        "id, number, createdAt:created_at, status, total, amountPaid:amount_paid, location:locations(name), supplier:suppliers(name, company, phone, address), user:users(firstName:first_name, lastName:last_name), " +
          "items:purchase_items(id, quantity, unitPrice:unit_price, total, product:products(name, reference, unit))"
      )
      .eq("id", id)
      .eq("business_id", user.businessId)
      .maybeSingle(),
  ]);
  if (!business || !data) notFound();
  const purchase = data as unknown as PurchaseRow;
  const money = (v: number) => formatMoney(v, business.currency);
  const qty = purchase.items.reduce((s, i) => s + i.quantity, 0);

  return (
    <div>
      <DocToolbar backHref={`/achats/${id}`} backLabel="Retour à l'achat" />
      <A4Document
        business={business}
        title="BON DE RÉCEPTION"
        meta={[`N° ${purchase.number}`, `Reçu le ${formatDateTime(new Date(purchase.createdAt))}`, purchase.location.name]}
        party={{
          label: "Fournisseur",
          name: purchase.supplier.company || purchase.supplier.name,
          lines: [
            purchase.supplier.company ? purchase.supplier.name : null,
            purchase.supplier.address,
            purchase.supplier.phone ? `Tél : ${purchase.supplier.phone}` : null,
          ],
        }}
        printedAt={new Date()}
        printedBy={printedByName(user)}
        zindoMention={zindoMention}
        signatures={[
          { label: "Réceptionné par", name: purchase.user ? `${purchase.user.firstName} ${purchase.user.lastName}`.trim() : null },
          { label: "Le livreur / fournisseur" },
        ]}
      >
        <DocSection title="Marchandise reçue">
          <DocTable
            columns={[
              { label: "N°" },
              { label: "Réf." },
              { label: "Désignation" },
              { label: "Quantité", align: "right" },
              { label: "P.U. d'achat", align: "right" },
              { label: "Total", align: "right" },
            ]}
            rows={[
              ...purchase.items.map((item, i) => ({
                key: item.id,
                cells: [
                  i + 1,
                  <span key="r" className="font-mono">{item.product.reference}</span>,
                  item.product.name,
                  `${item.quantity} ${item.product.unit}`,
                  money(item.unitPrice),
                  money(item.total),
                ],
              })),
              { cells: ["", "", "Total", qty, "", money(purchase.total)], bold: true },
            ]}
          />
        </DocSection>
        <div className="mt-3 flex justify-end">
          <table className="w-72 text-xs">
            <tbody>
              <tr>
                <td className="py-0.5">Montant de l&apos;achat</td>
                <td className="py-0.5 text-right">{money(purchase.total)}</td>
              </tr>
              <tr>
                <td className="py-0.5">Déjà payé</td>
                <td className="py-0.5 text-right">{money(purchase.amountPaid)}</td>
              </tr>
              <tr className="border-t-2 border-zinc-900 text-sm font-bold">
                <td className="py-1">RESTE À PAYER</td>
                <td className="py-1 text-right">{money(Math.max(0, purchase.total - purchase.amountPaid))}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs italic">
          Arrêté à la somme de : {amountInWords(purchase.total, business.currency)}.
        </p>
        <p className="mt-4 text-xs">Observations (manquants, articles abîmés…) :</p>
        <p className="text-zinc-300">..............................................................................................................................................................</p>
      </A4Document>
    </div>
  );
}
