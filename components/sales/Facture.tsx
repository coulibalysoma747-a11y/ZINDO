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
  paymentMethodLabel?: string;
  amountPaid?: number;
  change?: number;
  remaining?: number;
  footerMessage?: string | null;
  currency?: string;
  qrCodeDataUrl?: string | null;
  /** "Facture" par défaut — utilisé aussi pour le module Devis (voir app/(app)/devis). */
  documentTitle?: string;
  /** "DOIT" par défaut. */
  partyLabel?: string;
  /** Devis uniquement : affichée sous le numéro. */
  validUntil?: Date | string | null;
  /** Slogan du commerce, affiché sous le nom (/parametres). */
  tagline?: string | null;
  /** Ex : "*144*3*XXXXXXX#" (/parametres). */
  mobileMoneyInfo?: string | null;
  /** Nom affiché sous la ligne de signature (/parametres). */
  signerName?: string | null;
  /** Petite mention affichée en bas, sous le message de remerciement (/parametres). */
  returnPolicy?: string | null;
  /** Ex : "Facture intégralement réglée" — dérivé du statut de la vente. */
  statusLabel?: string | null;
  /** Identifiant Financier Unique (/parametres) — affiché seulement si renseigné. */
  ifu?: string | null;
  /** Registre du Commerce et du Crédit Mobilier (/parametres) — affiché seulement si renseigné. */
  rccm?: string | null;
  /** Modèle visuel choisi (/parametres) — lu par components/sales/InvoiceDocument.tsx, ignoré par ce composant lui-même. */
  templateId?: string | null;
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
          {data.tagline && <p className="mt-1.5 text-sm font-semibold text-zinc-700">{data.tagline}</p>}
          {data.businessActivity && (
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.1em] text-zinc-600">{data.businessActivity}</p>
          )}
          {(data.locationAddress ?? data.businessAddress) && (
            <p className="mt-1.5 text-sm leading-relaxed text-zinc-600">{data.locationAddress ?? data.businessAddress}</p>
          )}
          {(data.businessPhone || data.businessEmail) && (
            <p className="text-sm leading-relaxed text-zinc-600">
              {[data.businessPhone ? `Tél : ${data.businessPhone}` : null, data.businessEmail].filter(Boolean).join("  ·  ")}
            </p>
          )}
          {data.mobileMoneyInfo && (
            <p className="text-sm leading-relaxed text-zinc-600">Mobile money {data.mobileMoneyInfo}</p>
          )}
          {(data.ifu || data.rccm) && (
            <p className="mt-1.5 text-xs text-zinc-500">
              {[data.ifu ? `IFU ${data.ifu}` : null, data.rccm ? `RCCM ${data.rccm}` : null].filter(Boolean).join("  ·  ")}
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
            {data.documentTitle ?? "Facture"}
          </p>
          <p className="mt-2 text-sm text-zinc-500">
            N° <span className="font-semibold text-zinc-900">{data.invoiceNumber}</span>
          </p>
          {data.validUntil && (
            <p className="mt-1 text-sm text-zinc-500">Valable jusqu&apos;au {formatLongDate(data.validUntil)}</p>
          )}
        </div>

        {/* Client + détails de la vente */}
        <div className="mt-8 flex flex-wrap items-start justify-between gap-4">
          <div className="leading-relaxed">
            <span className="font-bold text-zinc-900 underline">{data.partyLabel ?? "DOIT"}</span>
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
            {data.paymentMethodLabel && (
              <p>
                Paiement : <span className="font-medium text-zinc-900">{data.paymentMethodLabel}</span>
              </p>
            )}
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

        {/* Règlement */}
        {!!data.paymentMethodLabel && (
          <div className="mt-6 flex justify-end">
            <div className="w-72">
              <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-zinc-500">Règlement</p>
              <div className="overflow-hidden rounded-lg border border-zinc-300 text-sm">
                <div className="flex justify-between px-3 py-2 text-zinc-600">
                  <span>{data.paymentMethodLabel}</span>
                  <span className="text-zinc-900">{money(data.amountPaid ?? 0)}</span>
                </div>
                {!!data.change && data.change > 0 && (
                  <div className="flex justify-between border-t border-zinc-200 px-3 py-2 text-emerald-600">
                    <span>Monnaie rendue</span>
                    <span>{money(data.change)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-zinc-200 bg-zinc-50 px-3 py-2 font-semibold text-zinc-900">
                  <span>Total encaissé</span>
                  <span>{money(data.amountPaid ?? 0)}</span>
                </div>
                <div className="flex justify-between border-t border-zinc-200 bg-zinc-50 px-3 py-2 font-semibold text-zinc-900">
                  <span>Reste à payer</span>
                  <span>{money(data.remaining ?? 0)}</span>
                </div>
              </div>
              {data.statusLabel && <p className="mt-1.5 text-right text-xs italic text-zinc-500">Statut : {data.statusLabel}</p>}
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
            {data.signerName && <p className="mt-1.5 text-sm text-zinc-700">{data.signerName}</p>}
          </div>
        </div>

        {data.returnPolicy && (
          <p className="mt-8 border-t border-zinc-100 pt-3 text-center text-[10px] leading-relaxed text-zinc-400">
            {data.returnPolicy}
          </p>
        )}
      </div>
    </>
  );
}
