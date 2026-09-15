import { formatMoney, formatDateTime } from "@/lib/format";

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
  businessPhone?: string | null;
  businessAddress?: string | null;
  businessEmail?: string | null;
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
 * Facture A4 détaillée — document distinct du ticket de caisse compact
 * (components/sales/Receipt.tsx) : mise en page plus soignée, tableau
 * article par article plus complet, espace de signature et QR code de
 * vérification. Toujours au format A4, autonome (CSS d'impression embarqué).
 */
export function Facture({ data }: { data: FactureData }) {
  const currency = data.currency ?? "XOF";
  const money = (v: number) => formatMoney(v, currency);

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4; margin: 14mm; }
          html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
          /* Comme pour Receipt.tsx : pas de visibility:hidden/position absolue
             ici. Chaque écran qui affiche une facture masque explicitement le
             reste de son propre contenu avec print:hidden (display:none) —
             voir ReceiptPrintPanel et les pages dédiées. La facture flotte
             simplement dans le flux normal. */
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
        {/* En-tête */}
        <div className="flex items-start justify-between gap-6 border-b-2 border-zindo-ink-900 pb-6">
          <div className="flex items-start gap-4">
            {data.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.logoUrl} alt={data.businessName} className="h-14 w-14 object-contain" />
            )}
            <div>
              <p className="text-lg font-extrabold uppercase tracking-wide text-zindo-ink-900">
                {data.businessName}
              </p>
              {data.locationName && <p className="text-sm text-zinc-500">{data.locationName}</p>}
              {(data.locationAddress ?? data.businessAddress) && (
                <p className="text-sm text-zinc-500">{data.locationAddress ?? data.businessAddress}</p>
              )}
              <p className="text-sm text-zinc-500">
                {[data.businessPhone, data.businessEmail].filter(Boolean).join("  ·  ")}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-extrabold tracking-wide text-zindo-green-600">FACTURE</p>
            <p className="mt-1 text-sm text-zinc-500">
              N° <span className="font-semibold text-zinc-900">{data.invoiceNumber}</span>
            </p>
            <p className="text-sm text-zinc-500">{formatDateTime(data.date)}</p>
          </div>
        </div>

        {/* Informations client / vente */}
        <div className="mt-6 grid grid-cols-2 gap-6">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">Facturé à</p>
            {data.customerName ? (
              <>
                <p className="font-semibold text-zinc-900">{data.customerName}</p>
                {data.customerPhone && <p className="text-sm text-zinc-600">{data.customerPhone}</p>}
                {data.customerAddress && <p className="text-sm text-zinc-600">{data.customerAddress}</p>}
              </>
            ) : (
              <p className="text-sm text-zinc-500">Client de passage</p>
            )}
          </div>
          <div className="text-right">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">Détails</p>
            {data.cashierName && (
              <p className="text-sm text-zinc-600">
                Émise par <span className="font-medium text-zinc-900">{data.cashierName}</span>
              </p>
            )}
            <p className="text-sm text-zinc-600">
              Paiement : <span className="font-medium text-zinc-900">{data.paymentMethodLabel}</span>
            </p>
          </div>
        </div>

        {/* Tableau des articles */}
        <table className="mt-8 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-zindo-ink-900 text-left text-xs uppercase tracking-wide text-zinc-500">
              <th className="py-2 pr-2">Référence</th>
              <th className="py-2 pr-2">Désignation</th>
              <th className="py-2 pr-2 text-right">Qté</th>
              <th className="py-2 pr-2">Unité</th>
              <th className="py-2 pr-2 text-right">P.U.</th>
              <th className="py-2 pr-2 text-right">Remise</th>
              <th className="py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, i) => (
              <tr key={i} className="border-b border-zinc-100">
                <td className="py-2.5 pr-2 font-mono text-xs text-zinc-500">{item.reference ?? "—"}</td>
                <td className="py-2.5 pr-2 font-medium text-zinc-900">{item.name}</td>
                <td className="py-2.5 pr-2 text-right">{item.quantity}</td>
                <td className="py-2.5 pr-2 text-zinc-500">{item.unit ?? "—"}</td>
                <td className="py-2.5 pr-2 text-right">{money(item.unitPrice)}</td>
                <td className="py-2.5 pr-2 text-right">{item.discount ? `-${money(item.discount)}` : "—"}</td>
                <td className="py-2.5 text-right font-semibold text-zinc-900">{money(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totaux */}
        <div className="mt-6 flex justify-end">
          <div className="w-72 space-y-1.5 text-sm">
            <div className="flex justify-between text-zinc-600">
              <span>Sous-total</span>
              <span>{money(data.subtotal)}</span>
            </div>
            {!!data.discount && data.discount > 0 && (
              <div className="flex justify-between text-zinc-600">
                <span>Remise globale</span>
                <span>-{money(data.discount)}</span>
              </div>
            )}
            <div className="flex justify-between border-t-2 border-zindo-ink-900 pt-1.5 text-base font-extrabold text-zindo-ink-900">
              <span>TOTAL</span>
              <span>{money(data.total)}</span>
            </div>
            <div className="flex justify-between text-zinc-600">
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

        {/* Signatures */}
        <div className="mt-14 grid grid-cols-2 gap-10">
          <div>
            <p className="mb-10 text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Signature du client
            </p>
            <div className="border-t border-zinc-300" />
          </div>
          <div>
            <p className="mb-10 text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Cachet et signature — {data.businessName}
            </p>
            <div className="border-t border-zinc-300" />
          </div>
        </div>

        {/* Pied de page : vérification + message */}
        <div className="mt-10 flex items-end justify-between border-t border-zinc-100 pt-6">
          <p className="max-w-sm text-xs text-zinc-400">
            {data.footerMessage ?? "Merci pour votre confiance."}
          </p>
          {data.qrCodeDataUrl && (
            <div className="flex flex-col items-center gap-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={data.qrCodeDataUrl} alt="QR code de vérification" width={78} height={78} />
              <p className="text-[10px] tracking-wide text-zinc-400">Scannez pour vérifier</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
