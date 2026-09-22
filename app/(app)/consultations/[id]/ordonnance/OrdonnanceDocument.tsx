import { formatLongDate, formatDateTime } from "@/lib/format";
import type { Ordonnance } from "@/lib/actions/consultations";
import type { ReceiptWidth } from "@/components/sales/Receipt";

export type OrdonnanceDocumentData = Ordonnance & {
  businessName: string;
  businessPhone?: string | null;
  businessAddress?: string | null;
  logoUrl?: string | null;
  /** Image du QR code de vérification (data URL), déjà générée côté serveur — voir lib/verification.ts. */
  qrCodeDataUrl?: string | null;
};

const SEX_LABELS: Record<"M" | "F", string> = { M: "Masculin", F: "Féminin" };

const DASH_LENGTH: Record<ReceiptWidth, number> = { "58mm": 32, "80mm": 44, A4: 90 };
const PAGE_SIZE: Record<ReceiptWidth, string> = { "58mm": "58mm auto", "80mm": "80mm auto", A4: "A4" };
const QR_SIZE: Record<ReceiptWidth, number> = { "58mm": 84, "80mm": 116, A4: 150 };

function DashLine({ width }: { width: ReceiptWidth }) {
  return <div className="whitespace-nowrap overflow-hidden tracking-wide">{"-".repeat(DASH_LENGTH[width])}</div>;
}

/**
 * Ordonnance imprimable — A4 (document officiel façon components/sales/Facture.tsx)
 * ou 58mm/80mm (ticket thermique façon components/sales/Receipt.tsx), au choix,
 * pour les cabinets qui n'ont qu'une imprimante thermique. Document distinct
 * d'un reçu de paiement : liste de produits prescrits, jamais de montant à
 * payer. Aucun impact sur le stock (voir
 * docs/cahier-des-charges-cabinet-medical.md §3.5).
 */
export function OrdonnanceDocument({ data, width = "A4" }: { data: OrdonnanceDocumentData; width?: ReceiptWidth }) {
  if (width !== "A4") return <OrdonnanceTicket data={data} width={width} />;

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4; margin: 14mm; }
          html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
          #zindo-ordonnance { width: 100%; margin: 0; box-shadow: none; border: none; }
        }
      `}</style>

      <div
        id="zindo-ordonnance"
        className="mx-auto w-full max-w-[210mm] rounded-2xl border border-zinc-200 bg-white p-12 font-serif text-zinc-800 shadow-sm"
      >
        <div className="border-b-4 border-double border-zindo-ink-900 pb-5 text-center">
          {data.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.logoUrl} alt={data.businessName} className="mx-auto mb-3 h-14 w-14 object-contain" />
          )}
          <p className="text-3xl font-bold uppercase tracking-wide text-zindo-ink-900">{data.businessName}</p>
          {data.businessAddress && <p className="mt-1.5 text-sm leading-relaxed text-zinc-600">{data.businessAddress}</p>}
          {data.businessPhone && <p className="text-sm leading-relaxed text-zinc-600">Tél : {data.businessPhone}</p>}
        </div>

        <p className="mt-6 text-right text-sm italic text-zinc-600">le {formatLongDate(data.date)}</p>

        <div className="mt-6 text-center">
          <p className="inline-block border-b-2 border-zindo-ink-900 pb-1.5 text-2xl font-bold uppercase tracking-[0.2em] text-zindo-ink-900">
            Ordonnance
          </p>
          <p className="mt-2 text-sm text-zinc-500">
            N° <span className="font-semibold text-zinc-900">{data.number}</span>
          </p>
        </div>

        <div className="mt-8 flex flex-wrap items-start justify-between gap-4 text-sm leading-relaxed">
          <div>
            <span className="font-bold text-zinc-900 underline">Patient</span>
            <span className="text-zinc-900"> : {data.patientName ?? data.patientCode ?? "—"}</span>
            <p className="text-zinc-600">
              {SEX_LABELS[data.sex]}
              {data.patientAge != null ? ` · ${data.patientAge} ans` : ""}
            </p>
            <p className="text-zinc-600">Diagnostic : {data.diagnosis}</p>
          </div>
          {data.doctorName && (
            <div className="text-right text-zinc-600">
              <p>
                Prescrit par <span className="font-medium text-zinc-900">{data.doctorName}</span>
              </p>
            </div>
          )}
        </div>

        {data.items.length === 0 ? (
          <p className="mt-10 text-center text-sm text-zinc-500">Aucun médicament prescrit pour cette consultation.</p>
        ) : (
          <table className="mt-8 w-full border-collapse text-sm">
            <thead>
              <tr className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-600">
                <th className="border border-zinc-300 px-3 py-3">Médicament / produit</th>
                <th className="w-20 border border-zinc-300 px-3 py-3 text-right">Qté</th>
                <th className="border border-zinc-300 px-3 py-3">Posologie</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item, i) => (
                <tr key={i}>
                  <td className="border border-zinc-300 px-3 py-3 font-medium text-zinc-900">{item.productName}</td>
                  <td className="border border-zinc-300 px-3 py-3 text-right">
                    {item.quantity}
                    {item.unit ? ` ${item.unit}` : ""}
                  </td>
                  <td className="border border-zinc-300 px-3 py-3 text-zinc-700">{item.posology ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="mt-10 flex flex-wrap items-end justify-between gap-6">
          {data.qrCodeDataUrl && (
            <div className="flex flex-col items-center gap-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={data.qrCodeDataUrl} alt="QR code de vérification" width={QR_SIZE.A4} height={QR_SIZE.A4} />
              <p className="text-center text-[10px] tracking-wide text-zinc-500">Scannez pour vérifier</p>
            </div>
          )}
          <div className="ml-auto text-center text-sm text-zinc-600">
            <p>Signature et cachet</p>
            <div className="mt-14 w-48 border-t border-zinc-400" />
          </div>
        </div>
      </div>
    </>
  );
}

/** Version compacte 58mm/80mm — mise en page calquée sur components/sales/Receipt.tsx. */
function OrdonnanceTicket({ data, width }: { data: OrdonnanceDocumentData; width: "58mm" | "80mm" }) {
  const containerWidthClass = width === "58mm" ? "max-w-[58mm]" : "max-w-[80mm]";

  return (
    <>
      <style>{`
        #zindo-ordonnance {
          font-family: "Courier New", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        }
        @media print {
          @page { size: ${PAGE_SIZE[width]}; margin: 0; }
          html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
          #zindo-ordonnance { width: ${width}; max-width: none; margin: 0; padding: 3mm 2.5mm; box-shadow: none; border: none; }
        }
      `}</style>

      <div
        id="zindo-ordonnance"
        className={`mx-auto w-full ${containerWidthClass} rounded-xl border border-zinc-200 bg-white p-4 text-[13px] leading-snug text-zinc-800 shadow-sm`}
      >
        <div className="text-center">
          {data.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.logoUrl} alt={data.businessName} className="mx-auto mb-1 h-10 object-contain" />
          )}
          <p className="text-sm font-bold uppercase">{data.businessName}</p>
          {data.businessAddress && <p>{data.businessAddress}</p>}
          {data.businessPhone && <p>Tél : {data.businessPhone}</p>}
        </div>

        <DashLine width={width} />

        <p className="text-center text-sm font-bold uppercase tracking-wide">Ordonnance</p>
        <div className="flex justify-between">
          <span>N°</span>
          <span className="font-semibold">{data.number}</span>
        </div>
        <div className="flex justify-between">
          <span>Date</span>
          <span>{formatDateTime(data.date)}</span>
        </div>
        <div className="flex justify-between">
          <span>Patient</span>
          <span>{data.patientName ?? data.patientCode ?? "—"}</span>
        </div>
        <div className="flex justify-between">
          <span>Sexe / Âge</span>
          <span>
            {SEX_LABELS[data.sex]}
            {data.patientAge != null ? ` · ${data.patientAge} ans` : ""}
          </span>
        </div>
        {data.doctorName && (
          <div className="flex justify-between">
            <span>Médecin</span>
            <span>{data.doctorName}</span>
          </div>
        )}

        <DashLine width={width} />

        {data.items.length === 0 ? (
          <p className="py-2 text-center">Aucun médicament prescrit.</p>
        ) : (
          <div className="space-y-1.5 py-1">
            {data.items.map((item, i) => (
              <div key={i}>
                <p className="font-semibold">
                  {item.productName} — {item.quantity}
                  {item.unit ? ` ${item.unit}` : ""}
                </p>
                {item.posology && <p className="text-zinc-600">{item.posology}</p>}
              </div>
            ))}
          </div>
        )}

        <DashLine width={width} />

        {data.qrCodeDataUrl && (
          <div className="flex flex-col items-center gap-1 py-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={data.qrCodeDataUrl}
              alt="QR code de vérification de l'ordonnance"
              width={QR_SIZE[width]}
              height={QR_SIZE[width]}
              style={{ width: QR_SIZE[width], height: QR_SIZE[width] }}
            />
            <p className="text-center text-[10px] tracking-wide text-zinc-500">Scannez pour vérifier cette ordonnance</p>
          </div>
        )}

        <DashLine width={width} />

        <p className="pt-2 text-center">Signature / cachet</p>
      </div>
    </>
  );
}
