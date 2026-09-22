import { formatLongDate } from "@/lib/format";
import type { Ordonnance } from "@/lib/actions/consultations";

export type OrdonnanceDocumentData = Ordonnance & {
  businessName: string;
  businessPhone?: string | null;
  businessAddress?: string | null;
  logoUrl?: string | null;
};

const SEX_LABELS: Record<"M" | "F", string> = { M: "Masculin", F: "Féminin" };

/**
 * Ordonnance imprimable A4 — mise en page calquée sur components/sales/Facture.tsx
 * (police serif, filets, document officiel en noir et blanc), mais document
 * distinct : liste de produits prescrits, jamais un montant à payer. Aucun
 * impact sur le stock (voir docs/cahier-des-charges-cabinet-medical.md §3.5).
 */
export function OrdonnanceDocument({ data }: { data: OrdonnanceDocumentData }) {
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
                    {item.quantity} {item.unit}
                  </td>
                  <td className="border border-zinc-300 px-3 py-3 text-zinc-700">{item.posology ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="mt-16 flex justify-end">
          <div className="text-center text-sm text-zinc-600">
            <p>Signature et cachet</p>
            <div className="mt-14 w-48 border-t border-zinc-400" />
          </div>
        </div>
      </div>
    </>
  );
}
