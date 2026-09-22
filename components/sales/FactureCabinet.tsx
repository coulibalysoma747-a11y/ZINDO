import { formatMoney, formatLongDate } from "@/lib/format";
import type { FactureData } from "./Facture";

/**
 * Facture A4 — variante "Cabinet" : blanc/indigo formel, encadré sobre façon
 * document de consultation. Pensée pour le cabinet médical/clinique — reçu
 * d'actes et de produits facturés au patient, distincte du style clinique
 * "produit" de components/sales/FacturePharmacie.tsx. Dixième modèle du
 * sélecteur (voir lib/invoice-templates.ts), même FactureData que les autres.
 */
export function FactureCabinet({ data }: { data: FactureData }) {
  const currency = data.currency ?? "XOF";
  const money = (v: number) => formatMoney(v, currency);
  const documentTitle = data.documentTitle ?? "Facture";

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4; margin: 16mm; }
          html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
          #zindo-facture-cabinet { width: 100%; margin: 0; box-shadow: none; border: none; }
        }
      `}</style>

      <div
        id="zindo-facture-cabinet"
        className="mx-auto w-full max-w-[210mm] rounded-2xl border border-zinc-200 bg-white p-12 font-sans text-[#1c2333] shadow-sm"
      >
        {/* En-tête */}
        <div className="border-b-2 border-[#3949ab] pb-4 text-center">
          <p className="text-xl font-bold">{data.businessName}</p>
          {(data.tagline || data.businessActivity) && (
            <p className="mt-1 text-[11px] uppercase tracking-[0.1em] text-[#6b7280]">{data.tagline ?? data.businessActivity}</p>
          )}
          <p className="mt-1.5 text-[10.5px] text-[#6b7280]">
            {[data.locationAddress ?? data.businessAddress, data.businessPhone].filter(Boolean).join(" · ")}
          </p>
        </div>

        {/* Titre document */}
        <div className="mt-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#3949ab]">{documentTitle}</p>
            <p className="mt-1 font-mono text-sm font-semibold">{data.invoiceNumber}</p>
          </div>
          <p className="text-[11px] text-[#6b7280]">{formatLongDate(data.date)}</p>
        </div>

        {/* Patient / règlement */}
        <div className="mt-4 grid grid-cols-2 gap-4 border-y border-[#e2e5f0] py-3">
          <div>
            <p className="text-[9.5px] font-semibold uppercase tracking-wide text-[#6b7280]">{data.partyLabel ?? "Patient"}</p>
            <p className="mt-0.5 text-[13px] font-semibold">{data.customerName ?? "Patient de passage"}</p>
            {data.customerPhone && <p className="text-[10.5px] text-[#6b7280]">{data.customerPhone}</p>}
          </div>
          <div className="text-right">
            <p className="text-[9.5px] font-semibold uppercase tracking-wide text-[#6b7280]">Règlement</p>
            <p className="mt-0.5 text-[13px] font-semibold">{data.paymentMethodLabel ?? "—"}</p>
            {data.statusLabel && <p className="text-[10.5px] text-[#6b7280]">{data.statusLabel}</p>}
          </div>
        </div>

        {/* Actes / produits */}
        <table className="mt-5 w-full border-collapse text-[11.5px]">
          <thead>
            <tr className="text-[9px] font-semibold uppercase tracking-wide text-[#6b7280]">
              <th className="border-b border-[#3949ab] px-2 py-2 text-left">Acte / produit</th>
              <th className="border-b border-[#3949ab] px-2 py-2 text-center">Qté</th>
              <th className="border-b border-[#3949ab] px-2 py-2 text-right">P.U.</th>
              <th className="border-b border-[#3949ab] px-2 py-2 text-right">Montant</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, i) => (
              <tr key={i} className="border-b border-[#eef0f7]">
                <td className="px-2 py-2.5">{item.name}</td>
                <td className="px-2 py-2.5 text-center">{item.quantity}</td>
                <td className="px-2 py-2.5 text-right font-mono">{money(item.unitPrice)}</td>
                <td className="px-2 py-2.5 text-right font-mono">{money(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Total */}
        <div className="mt-5 flex justify-end">
          <div className="w-64 rounded-lg border border-[#3949ab] px-4 py-3">
            <div className="flex justify-between text-[11px] text-[#6b7280]">
              <span>Sous-total</span>
              <span className="font-mono">{money(data.subtotal)}</span>
            </div>
            {!!data.discount && data.discount > 0 && (
              <div className="mt-0.5 flex justify-between text-[11px] text-[#6b7280]">
                <span>Remise</span>
                <span className="font-mono">− {money(data.discount)}</span>
              </div>
            )}
            <div className="mt-1.5 flex items-baseline justify-between border-t border-[#e2e5f0] pt-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wide text-[#3949ab]">Total</span>
              <span className="font-mono text-lg font-bold text-[#3949ab]">{money(data.total)}</span>
            </div>
          </div>
        </div>

        {/* Pied de page */}
        <div className="mt-10 flex items-end justify-between gap-4 text-[10px] text-[#6b7280]">
          <p className="max-w-sm leading-relaxed">
            {[data.footerMessage ?? "Merci pour votre confiance.", data.ifu ? `IFU ${data.ifu}` : null, data.rccm ? `RCCM ${data.rccm}` : null, data.returnPolicy]
              .filter(Boolean)
              .join(" — ")}
          </p>
          {data.signerName && (
            <div className="text-right">
              <div className="mb-8 w-44 border-t border-[#e2e5f0]" />
              {data.signerName}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
