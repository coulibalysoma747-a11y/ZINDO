import { formatMoney, formatDateTime } from "@/lib/format";

export type ReceiptItem = {
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

export type ReceiptData = {
  businessName: string;
  businessPhone?: string | null;
  businessAddress?: string | null;
  logoUrl?: string | null;
  locationName?: string | null;
  locationAddress?: string | null;
  ticketNumber: string;
  date: Date | string;
  cashierName?: string | null;
  customerName?: string | null;
  items: ReceiptItem[];
  subtotal: number;
  discount?: number;
  total: number;
  paymentMethodLabel: string;
  amountPaid: number;
  change?: number;
  remaining?: number;
  footerMessage?: string | null;
  currency?: string;
  /** Image du QR code de vérification (data URL), déjà générée côté serveur. */
  qrCodeDataUrl?: string | null;
  /** Taille d'affichage choisie par le commerce, en pixels. 0 (ou absent) = taille automatique selon le format. */
  qrCodeSize?: number;
};

export type ReceiptWidth = "58mm" | "80mm" | "A4";

// Taille d'affichage par défaut du QR code lorsque le commerce n'a pas choisi
// de taille fixe — adaptée au format du ticket.
const DEFAULT_QR_SIZE: Record<ReceiptWidth, number> = {
  "58mm": 84,
  "80mm": 116,
  A4: 150,
};

// Longueur approximative d'une ligne de séparation en tirets pour chaque format,
// calquée sur le nombre de caractères qu'une imprimante thermique imprime réellement
// sur une ligne (police monospace par défaut).
const DASH_LENGTH: Record<ReceiptWidth, number> = {
  "58mm": 32,
  "80mm": 44,
  A4: 90,
};

const PAGE_SIZE: Record<ReceiptWidth, string> = {
  "58mm": "58mm auto",
  "80mm": "80mm auto",
  A4: "A4",
};

function DashLine({ width }: { width: ReceiptWidth }) {
  return <div className="receipt-dashes">{"-".repeat(DASH_LENGTH[width])}</div>;
}

/**
 * Ticket de caisse — pensé pour l'impression thermique 58mm/80mm (et un repli A4
 * pour une imprimante classique). Le composant est autonome : il embarque son
 * propre CSS d'impression (taille de page, marges, masquage du reste de l'écran)
 * afin de fonctionner quel que soit l'endroit où il est monté.
 */
export function Receipt({ data, width = "80mm" }: { data: ReceiptData; width?: ReceiptWidth }) {
  const currency = data.currency ?? "XOF";
  const money = (v: number) => formatMoney(v, currency);
  const containerWidthClass =
    width === "58mm" ? "max-w-[58mm]" : width === "80mm" ? "max-w-[80mm]" : "max-w-[190mm]";
  const qrSize = data.qrCodeSize && data.qrCodeSize > 0 ? data.qrCodeSize : DEFAULT_QR_SIZE[width];

  return (
    <>
      {/* Styles d'impression propres au ticket : ils masquent automatiquement tout
          le reste de l'écran (menu, boutons, en-têtes de page...) et impriment
          uniquement le ticket, à sa largeur réelle, sans marge parasite. */}
      <style>{`
        #zindo-receipt {
          font-family: "Courier New", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        }
        .receipt-dashes {
          white-space: nowrap;
          overflow: hidden;
          letter-spacing: 0.02em;
        }
        @media print {
          @page {
            size: ${PAGE_SIZE[width]};
            margin: 0;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
          }
          body * {
            visibility: hidden;
          }
          #zindo-receipt, #zindo-receipt * {
            visibility: visible;
          }
          #zindo-receipt {
            position: absolute;
            top: 0;
            left: 0;
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
        {/* En-tête */}
        <div className="text-center">
          {data.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.logoUrl} alt={data.businessName} className="mx-auto mb-1 h-10 object-contain" />
          )}
          <p className="text-sm font-bold uppercase">{data.businessName}</p>
          {data.locationName && <p>{data.locationName}</p>}
          {(data.locationAddress ?? data.businessAddress) && (
            <p>{data.locationAddress ?? data.businessAddress}</p>
          )}
          {data.businessPhone && <p>Tél : {data.businessPhone}</p>}
        </div>

        <DashLine width={width} />

        <div className="flex justify-between">
          <span>Reçu N°</span>
          <span className="font-semibold">{data.ticketNumber}</span>
        </div>
        <div className="flex justify-between">
          <span>Date</span>
          <span>{formatDateTime(data.date)}</span>
        </div>
        {data.cashierName && (
          <div className="flex justify-between">
            <span>Caissier</span>
            <span>{data.cashierName}</span>
          </div>
        )}
        {data.customerName && (
          <div className="flex justify-between">
            <span>Client</span>
            <span>{data.customerName}</span>
          </div>
        )}

        <DashLine width={width} />

        {/* Corps : articles */}
        <table className="w-full table-fixed border-collapse">
          <thead>
            <tr className="text-left text-[11px]">
              <th className="w-[40%] break-words pb-1 pr-1 font-normal">Désignation</th>
              <th className="w-[14%] pb-1 pr-1 text-right font-normal">Qté</th>
              <th className="w-[23%] pb-1 pr-1 text-right font-normal">P.U.</th>
              <th className="w-[23%] pb-1 text-right font-normal">Total</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, i) => (
              <tr key={i} className="align-top">
                <td className="break-words py-0.5 pr-1">{item.name}</td>
                <td className="py-0.5 pr-1 text-right">{item.quantity}</td>
                <td className="py-0.5 pr-1 text-right">{money(item.unitPrice)}</td>
                <td className="py-0.5 text-right font-medium">{money(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <DashLine width={width} />

        {/* Pied : totaux et paiement */}
        <div className="space-y-0.5">
          <div className="flex justify-between">
            <span>Sous-total</span>
            <span>{money(data.subtotal)}</span>
          </div>
          {!!data.discount && data.discount > 0 && (
            <div className="flex justify-between">
              <span>Remise</span>
              <span>-{money(data.discount)}</span>
            </div>
          )}
          <div className="flex justify-between text-[15px] font-bold">
            <span>TOTAL</span>
            <span>{money(data.total)}</span>
          </div>
          <div className="flex justify-between">
            <span>Payé ({data.paymentMethodLabel})</span>
            <span>{money(data.amountPaid)}</span>
          </div>
          {!!data.change && data.change > 0 && (
            <div className="flex justify-between font-medium">
              <span>Monnaie rendue</span>
              <span>{money(data.change)}</span>
            </div>
          )}
          {!!data.remaining && data.remaining > 0 && (
            <div className="flex justify-between font-medium">
              <span>Reste à payer</span>
              <span>{money(data.remaining)}</span>
            </div>
          )}
        </div>

        {data.qrCodeDataUrl && (
          <>
            <DashLine width={width} />
            <div className="flex flex-col items-center gap-1 py-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={data.qrCodeDataUrl}
                alt="QR code de vérification du ticket"
                width={qrSize}
                height={qrSize}
                style={{ width: qrSize, height: qrSize }}
              />
              <p className="text-center text-[10px] tracking-wide text-zinc-500">
                Scannez pour vérifier ce ticket
              </p>
            </div>
          </>
        )}

        <DashLine width={width} />

        <p className="text-center">{data.footerMessage ?? "Merci pour votre visite."}</p>
      </div>
    </>
  );
}
