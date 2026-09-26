/* eslint-disable @next/next/no-img-element -- document imprimé : <img> garantit le rendu à l'impression/PDF. */
import { formatMoney, formatDateTime } from "@/lib/format";
import type { PaymentReceiptData } from "@/lib/client-documents";
import { PAYMENT_METHOD_LABELS } from "@/lib/payment-method-labels";
import type { ReceiptWidth } from "@/components/sales/Receipt";
import { ZindoMention } from "@/components/sales/ZindoMention";

const DASH_LENGTH: Record<ReceiptWidth, number> = { "58mm": 32, "80mm": 44, A4: 90 };
const PAGE_SIZE: Record<ReceiptWidth, string> = { "58mm": "58mm auto", "80mm": "80mm auto", A4: "A4" };

/**
 * Reçu de remboursement (flag « documents_client_pdf ») : même habillage que
 * le ticket de caisse classique (components/sales/Receipt.tsx), pour sortir
 * sur la même imprimante thermique.
 */
export function PaymentReceipt({
  data,
  width,
  zindoMention,
}: {
  data: PaymentReceiptData;
  width: ReceiptWidth;
  zindoMention: boolean;
}) {
  const { business, customer, payment } = data;
  // Comme le ticket de caisse : montants sans « FCFA », plus lisibles sur 58/80 mm.
  const money = (v: number) =>
    business.currency === "XOF" ? new Intl.NumberFormat("fr-FR").format(Math.round(v)) : formatMoney(v, business.currency);
  const dashes = <div className="receipt-dashes">{"-".repeat(DASH_LENGTH[width])}</div>;
  const row = (label: string, value: string, className = "") => (
    <div className={`flex justify-between gap-2 ${className}`}>
      <span>{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
  const containerWidthClass =
    width === "58mm" ? "max-w-[58mm]" : width === "80mm" ? "max-w-[80mm]" : "max-w-[190mm]";

  return (
    <>
      <style>{`
        #zindo-receipt { font-family: "Courier New", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
        .receipt-dashes { white-space: nowrap; overflow: hidden; letter-spacing: 0.02em; }
        @media print {
          @page { size: ${PAGE_SIZE[width]}; margin: 0; }
          html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
          #zindo-receipt {
            width: ${width === "A4" ? "190mm" : width};
            max-width: none;
            margin: 0;
            padding: ${width === "A4" ? "10mm" : "3mm 2.5mm"};
            box-shadow: none;
            border: none;
          }
        }
      `}</style>
      <div
        id="zindo-receipt"
        className={`mx-auto w-full ${containerWidthClass} rounded-xl border border-zinc-200 bg-white p-4 text-[13px] leading-snug text-zinc-800 shadow-sm`}
      >
        <div className="text-center">
          {business.logoUrl && <img src={business.logoUrl} alt={business.name} className="mx-auto mb-1 h-10 object-contain" />}
          <p className="text-sm font-bold uppercase">{business.name}</p>
          {business.address && <p>{business.address}</p>}
          {business.phone && <p>Tél : {business.phone}</p>}
        </div>

        {dashes}
        <p className="text-center text-[15px] font-bold">REÇU DE PAIEMENT</p>
        {dashes}

        {row("Reçu N°", data.receiptNumber, "font-semibold")}
        {row("Date", formatDateTime(payment.createdAt))}
        {data.cashierName && row("Caissier", data.cashierName)}
        {row("Client", customer.name)}
        {customer.phone && row("Tél.", customer.phone)}

        {dashes}

        {data.allocations.length > 0 && (
          <>
            <p className="text-[11px]">Paiement imputé sur :</p>
            {data.allocations.map((a, i) => (
              <div key={i}>{row(`Vente ${a.number}`, money(a.amount))}</div>
            ))}
            {dashes}
          </>
        )}

        {row("MONTANT REÇU", money(payment.amount), "text-[15px] font-bold")}
        {row("Mode", PAYMENT_METHOD_LABELS[payment.method] ?? payment.method)}
        {payment.note && row("Note", payment.note)}

        {dashes}

        {data.currentDebt > 0
          ? row("Reste dû à ce jour", money(data.currentDebt), "font-bold")
          : <p className="text-center font-bold">Compte soldé. Merci !</p>}
        <p className="text-center text-[10px] text-zinc-500">Situation au {formatDateTime(data.printedAt)}</p>

        {dashes}

        <div className="mt-3 text-[11px]">
          <p>Signature :</p>
          <div className="mt-6 border-t border-zinc-400" />
        </div>

        <p className="mt-2 text-center">{data.footerMessage ?? "Merci pour votre confiance."}</p>
        {zindoMention && <ZindoMention className="mt-1" />}
      </div>
    </>
  );
}
