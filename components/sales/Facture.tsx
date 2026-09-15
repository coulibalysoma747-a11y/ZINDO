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
 * code de vérification. Police serif et double-filets pour un rendu de
 * document officiel, en noir et blanc uniquement (pas de couleur de marque
 * — choix délibéré). Document distinct du ticket de caisse compact
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
        className="mx-auto w-full max-w-[210mm] rounded-2xl border border-zinc-200 bg-white p-12 font-serif text-zinc-800 shadow-sm"
      >
        {/* En-tête : identité du commerce, centrée, filet double façon papier à en-tête */}
        <div className="border-b-4 border-double border-zindo-ink-900 pb-5 text-center">
          {data.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.logoUrl} alt={data.businessName} className="mx-auto mb-3 h-14 w-14 object-contain" />
          )}
          <p className="text-3xl font-bold uppercase tracking-wide text-zindo-ink-900">{data.businessName}</p>
          {data.businessActivity && (
            <p className="mt-1.5 text-xs uppercase tracking-[0.15em] text-zinc-500">{data.businessActivity}</p>
          )}
          {(data.locationAddress ?? data.businessAddress) && (
            <p className="mt-1.5 text-sm leading-relaxed text-zinc-600">{data.locationAddress ?? data.businessAddress}</p>
          )}
          {(data.businessPhone || data.businessEmail) && (
            <p className="text-sm leading-relaxed text-zinc-600">
              {[data.businessPhone ? `Tél : ${data.businessPhone}` : null, data.businessEmail].filter(Boolean).join("  ·  ")}
            </p>
          )}
        </div>

        {/* Lieu et date */}
        <p className="mt-6 text-right text-sm italic text-zinc-600">
          {(data.businessCity ?? data.locationName) ? `${data.businessCity ?? data.locationName}, ` : ""}
          le {formatLongDate(data.date)}
        </p>

        {/* Titre */}
        <div className="mt-6 text-center">
          <p className="inline-block border-b-2 border-zindo-ink-900 pb-1.5 text-2xl font-bold uppercase tracking-[0.2em] text-zindo-ink-900">
            Facture
          </p>
          <p className="mt-2 text-sm text-zinc-500">
            N° <span className="font-semibold text-zinc-900">{data.invoiceNumber}</span>
          </p>
        </div>

        {/* Client + détails de la vente */}
        <div className="mt-8 flex flex-wrap items-start justify-between gap-4">
          <div className="leading-relaxed">
            <span className="font-bold text-zinc-900 underline">DOIT</span>
            <span className="text-zinc-900"> : {data.customerName ?? "Client de passage"}</span>
            {data.customerPhone && <p className="text-sm text-zinc-600">{data.customerPhone}</p>}
            {data.customerAddress && <p className="text-sm text-zinc-600">{data.customerAddress}</p>}
          </div>
          <div className="text-right text-sm leading-relaxed text-zinc-600">
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
        <table className="mt-8 w-full border-collapse text-sm">
          <thead>
            <tr className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-600">
              <th className="border border-zinc-300 px-3 py-3">Désignation</th>
              <th className="w-20 border border-zinc-300 px-3 py-3 text-right">Qté</th>
              <th className="w-32 border border-zinc-300 px-3 py-3 text-right">P. Unitaire</th>
              <th className="w-32 border border-zinc-300 px-3 py-3 text-right">P. Total</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, i) => (
              <tr key={i} className="even:bg-zinc-50/60">
                <td className="border border-zinc-300 px-3 py-2.5 font-medium text-zinc-900">{item.name}</td>
                <td className="border border-zinc-300 px-3 py-2.5 text-right">{item.quantity}</td>
                <td className="border border-zinc-300 px-3 py-2.5 text-right">{money(item.unitPrice)}</td>
                <td className="border border-zinc-300 px-3 py-2.5 text-right font-medium text-zinc-900">{money(item.total)}</td>
              </tr>
            ))}
            {!!data.discount && data.discount > 0 && (
              <tr>
                <td colSpan={3} className="border border-zinc-300 px-3 py-2.5 text-right text-zinc-600">
                  Remise globale
                </td>
                <td className="border border-zinc-300 px-3 py-2.5 text-right text-zinc-600">-{money(data.discount)}</td>
              </tr>
            )}
            <tr>
              <td
                colSpan={3}
                className="border border-zinc-300 border-t-2 border-t-zindo-ink-900 px-3 py-3 text-right text-base font-extrabold text-zindo-ink-900"
              >
                TOTAL
              </td>
              <td className="border border-zinc-300 border-t-2 border-t-zindo-ink-900 px-3 py-3 text-right text-base font-extrabold text-zindo-ink-900">
                {money(data.total)}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Montant en toutes lettres */}
        <p className="mt-6 text-sm leading-relaxed text-zinc-700">
          <span className="italic">Arrêtée la présente facture à la somme de</span> :{" "}
          <span className="font-semibold text-zinc-900">
            {amountInWords} {currencyWord}.
          </span>
        </p>

        {/* Paiement / reste à payer */}
        {(data.amountPaid > 0 || (!!data.remaining && data.remaining > 0) || (!!data.change && data.change > 0)) && (
          <div className="mt-4 flex justify-end border-t border-zinc-200 pt-3">
            <div className="w-64 space-y-1.5 text-sm text-zinc-600">
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
        <div className="mt-16 flex items-end justify-between gap-6">
          <div className="flex items-end gap-4">
            {data.qrCodeDataUrl && (
              <div className="flex flex-col items-center gap-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={data.qrCodeDataUrl} alt="QR code de vérification" width={76} height={76} />
                <p className="text-[10px] tracking-wide text-zinc-400">Scannez pour vérifier</p>
              </div>
            )}
            <p className="max-w-xs text-xs leading-relaxed text-zinc-400">
              {data.footerMessage ?? "Merci pour votre confiance."}
            </p>
          </div>

          <div className="text-center">
            <p className="mb-12 text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500">Le Responsable</p>
            <div className="w-52 border-t border-zinc-300" />
          </div>
        </div>
      </div>
    </>
  );
}
