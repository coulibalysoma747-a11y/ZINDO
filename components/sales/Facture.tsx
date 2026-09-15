import { formatMoney, formatLongDate, numberToFrenchWords } from "@/lib/format";

export type FactureItem = {
  reference?: string | null;
  name: string;
  unit?: string | null;
  quantity: number;
  unitPrice: number;
  discount?: number;
  total: number;
};

export type FactureData = {
  businessName: string;
  businessActivity?: string | null;
  businessPhone?: string | null;
  businessAddress?: string | null;
  businessEmail?: string | null;
  businessCity?: string | null;
  logoUrl?: string | null;
  locationName?: string | null;
  locationAddress?: string | null;
  invoiceNumber: string;
  date: Date | string;
  cashierName?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerAddress?: string | null;
  items: FactureItem[];
  subtotal: number;
  discount?: number;
  total: number;
  paymentMethodLabel: string;
  amountPaid: number;
  change?: number;
  remaining?: number;
  footerMessage?: string | null;
  currency?: string;
  qrCodeDataUrl?: string | null;
};

/**
 * Facture A4 — mise en page calquée sur le modèle de facture commerciale
 * papier utilisé par les commerçants (en-tête centré, mention "DOIT :",
 * tableau encadré, montant en toutes lettres, cachet), avec en plus un QR
 * code de vérification. Document distinct du ticket de caisse compact
 * (components/sales/Receipt.tsx). Autonome (CSS d'impression embarqué).
 */
export function Facture({ data }: { data: FactureData }) {
  const currency = data.currency ?? "XOF";
  const money = (v: number) => formatMoney(v, currency);
  const amountInWords = numberToFrenchWords(data.total);
  const currencyWord = currency === "XOF" ? "Francs CFA" : currency;

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4; margin: 14mm; }
          html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
          /* Chaque écran qui affiche une facture masque explicitement le reste
             de son propre contenu avec print:hidden (display:none) — voir
             ReceiptPrintPanel et les pages dédiées. La facture flotte
             simplement dans le flux normal, sans positionnement absolu/fixe. */
          #zindo-facture {
            width: 100%;
            margin: 0;
            box-shadow: none;
            border: none;
          }
        }
      `}</style>

      <div
        id="zindo-facture"
        className="mx-auto w-full max-w-[210mm] rounded-2xl border border-zinc-200 bg-white p-10 text-zinc-800 shadow-sm"
      >
        {/* En-tête : identité du commerce, centrée */}
        <div className="border-b-2 border-zindo-ink-900 pb-4 text-center">
          {data.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.logoUrl} alt={data.businessName} className="mx-auto mb-2 h-14 w-14 object-contain" />
          )}
          <p className="text-2xl font-extrabold uppercase tracking-wide text-zindo-ink-900">{data.businessName}</p>
          {data.businessActivity && <p className="mt-0.5 text-sm text-zinc-600">{data.businessActivity}</p>}
          {(data.locationAddress ?? data.businessAddress) && (
            <p className="mt-0.5 text-sm text-zinc-500">{data.locationAddress ?? data.businessAddress}</p>
          )}
          <p className="text-sm text-zinc-500">
            {[
              data.businessPhone ? `Tél : ${data.businessPhone}` : null,
              data.businessEmail,
            ]
              .filter(Boolean)
              .join("  ·  ")}
          </p>
        </div>

        {/* Lieu et date */}
        <p className="mt-4 text-right text-sm text-zinc-600">
          {(data.businessCity ?? data.locationName) ? `${data.businessCity ?? data.locationName}, ` : ""}
          le {formatLongDate(data.date)}
        </p>

        {/* Titre */}
        <div className="mt-4 text-center">
          <p className="inline-block border-b-2 border-zindo-ink-900 pb-1 text-xl font-extrabold uppercase tracking-wide text-zindo-ink-900">
            Facture
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            N° <span className="font-semibold text-zinc-900">{data.invoiceNumber}</span>
          </p>
        </div>

        {/* Client + détails de la vente */}
        <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="font-semibold text-zinc-900 underline">DOIT</span>
            <span className="text-zinc-900"> : {data.customerName ?? "Client de passage"}</span>
            {data.customerPhone && <p className="text-sm text-zinc-600">{data.customerPhone}</p>}
            {data.customerAddress && <p className="text-sm text-zinc-600">{data.customerAddress}</p>}
          </div>
          <div className="text-right text-sm text-zinc-600">
            {data.cashierName && (
              <p>
                Émise par <span className="font-medium text-zinc-900">{data.cashierName}</span>
              </p>
            )}
            <p>
              Paiement : <span className="font-medium text-zinc-900">{data.paymentMethodLabel}</span>
            </p>
          </div>
        </div>

        {/* Tableau des articles, encadré */}
        <table className="mt-6 w-full border-collapse text-sm">
          <thead>
            <tr className="bg-zinc-100 text-left text-xs uppercase tracking-wide text-zinc-600">
              <th className="border border-zinc-300 px-2 py-2">Désignation</th>
              <th className="border border-zinc-300 px-2 py-2 text-right">Qté</th>
              <th className="border border-zinc-300 px-2 py-2 text-right">P. Unitaire</th>
              <th className="border border-zinc-300 px-2 py-2 text-right">P. Total</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, i) => (
              <tr key={i}>
                <td className="border border-zinc-300 px-2 py-2 font-medium text-zinc-900">{item.name}</td>
                <td className="border border-zinc-300 px-2 py-2 text-right">{item.quantity}</td>
                <td className="border border-zinc-300 px-2 py-2 text-right">{money(item.unitPrice)}</td>
                <td className="border border-zinc-300 px-2 py-2 text-right font-medium text-zinc-900">{money(item.total)}</td>
              </tr>
            ))}
            {!!data.discount && data.discount > 0 && (
              <tr>
                <td colSpan={3} className="border border-zinc-300 px-2 py-2 text-right text-zinc-600">
                  Remise globale
                </td>
                <td className="border border-zinc-300 px-2 py-2 text-right text-zinc-600">-{money(data.discount)}</td>
              </tr>
            )}
            <tr className="bg-zinc-50">
              <td colSpan={3} className="border border-zinc-300 px-2 py-2 text-right font-extrabold text-zindo-ink-900">
                TOTAL
              </td>
              <td className="border border-zinc-300 px-2 py-2 text-right font-extrabold text-zindo-ink-900">
                {money(data.total)}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Montant en toutes lettres */}
        <p className="mt-4 text-sm text-zinc-700">
          Arrêtée la présente facture à la somme de :{" "}
          <span className="font-semibold text-zinc-900">
            {amountInWords} {currencyWord}.
          </span>
        </p>

        {/* Paiement / reste à payer */}
        {(data.amountPaid > 0 || (!!data.remaining && data.remaining > 0) || (!!data.change && data.change > 0)) && (
          <div className="mt-3 flex justify-end">
            <div className="w-64 space-y-1 text-sm text-zinc-600">
              <div className="flex justify-between">
                <span>Payé</span>
                <span>{money(data.amountPaid)}</span>
              </div>
              {!!data.change && data.change > 0 && (
                <div className="flex justify-between font-medium text-emerald-600">
                  <span>Monnaie rendue</span>
                  <span>{money(data.change)}</span>
                </div>
              )}
              {!!data.remaining && data.remaining > 0 && (
                <div className="flex justify-between font-medium text-red-600">
                  <span>Reste à payer</span>
                  <span>{money(data.remaining)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Pied de page : QR code de vérification + cachet */}
        <div className="mt-14 flex items-end justify-between gap-6">
          <div className="flex items-end gap-4">
            {data.qrCodeDataUrl && (
              <div className="flex flex-col items-center gap-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={data.qrCodeDataUrl} alt="QR code de vérification" width={70} height={70} />
                <p className="text-[10px] tracking-wide text-zinc-400">Scannez pour vérifier</p>
              </div>
            )}
            <p className="max-w-xs text-xs text-zinc-400">{data.footerMessage ?? "Merci pour votre confiance."}</p>
          </div>

          <div className="text-center">
            <p className="mb-10 text-xs font-semibold uppercase tracking-wide text-zinc-500">Le Responsable</p>
            <div className="w-48 border-t border-zinc-300" />
          </div>
        </div>
      </div>
    </>
  );
}
