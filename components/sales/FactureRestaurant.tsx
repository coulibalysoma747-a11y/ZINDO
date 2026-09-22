import { formatMoney, formatLongDate } from "@/lib/format";
import type { FactureData } from "./Facture";

/**
 * Facture A4 — variante "Restaurant" : chaleureuse, filets pointillés façon
 * addition de table, total dans une pastille arrondie. Pensée pour le
 * restaurant/maquis et le bar/buvette. Huitième modèle du sélecteur (voir
 * lib/invoice-templates.ts), même FactureData que les autres.
 */
export function FactureRestaurant({ data }: { data: FactureData }) {
  const currency = data.currency ?? "XOF";
  const money = (v: number) => formatMoney(v, currency);
  const documentTitle = data.documentTitle ?? "Addition";

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4; margin: 14mm; }
          html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
          #zindo-facture-restaurant { width: 100%; margin: 0; box-shadow: none; border: none; }
          #zindo-facture-restaurant, #zindo-facture-restaurant * {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>

      <div
        id="zindo-facture-restaurant"
        className="mx-auto w-full max-w-[210mm] rounded-2xl border border-zinc-200 bg-white p-11 font-sans text-[#3a241a] shadow-sm"
      >
        {/* En-tête */}
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="font-serif text-2xl font-semibold">{data.businessName}</p>
            <div className="mt-1.5 space-y-0.5 text-[11px] leading-relaxed text-[#8a6f5e]">
              {(data.locationAddress ?? data.businessAddress) && <p>{data.locationAddress ?? data.businessAddress}</p>}
              {(data.businessPhone || data.businessEmail) && <p>{[data.businessPhone, data.businessEmail].filter(Boolean).join(" · ")}</p>}
            </div>
          </div>
          <div className="text-right">
            <p className="font-serif text-lg italic text-[#c8632f]">{documentTitle}</p>
            <p className="mt-1 font-mono text-[12.5px]">{data.invoiceNumber}</p>
          </div>
        </div>

        {/* Table / client */}
        <div className="mt-5 flex flex-wrap justify-between gap-3 rounded-xl bg-[#fbf3ea] px-4 py-3 text-[11.5px]">
          <span>
            <b className="font-semibold">{data.partyLabel ?? "Client"} : </b>
            {data.customerName ?? "Client de passage"}
          </span>
          <span>{formatLongDate(data.date)}</span>
          {data.paymentMethodLabel && <span>{data.paymentMethodLabel}</span>}
        </div>

        {/* Articles */}
        <table className="mt-5 w-full border-collapse text-[12px]">
          <thead>
            <tr className="text-[9.5px] font-semibold uppercase tracking-wide text-[#8a6f5e]">
              <th className="border-b-2 border-[#c8632f] px-1.5 py-2 text-left">Plat / boisson</th>
              <th className="border-b-2 border-[#c8632f] px-1.5 py-2 text-center">Qté</th>
              <th className="border-b-2 border-[#c8632f] px-1.5 py-2 text-right">P.U.</th>
              <th className="border-b-2 border-[#c8632f] px-1.5 py-2 text-right">Montant</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, i) => (
              <tr key={i} className="border-b border-dashed border-[#eee0d3]">
                <td className="px-1.5 py-2.5">{item.name}</td>
                <td className="px-1.5 py-2.5 text-center">{item.quantity}</td>
                <td className="px-1.5 py-2.5 text-right font-mono">{money(item.unitPrice)}</td>
                <td className="px-1.5 py-2.5 text-right font-mono">{money(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totaux */}
        <div className="mt-5 flex justify-end">
          <div className="w-60">
            <div className="flex justify-between px-1 py-1 text-[11.5px] text-[#8a6f5e]">
              <span>Sous-total</span>
              <span className="font-mono">{money(data.subtotal)}</span>
            </div>
            {!!data.discount && data.discount > 0 && (
              <div className="flex justify-between px-1 py-1 text-[11.5px] text-[#8a6f5e]">
                <span>Remise</span>
                <span className="font-mono">− {money(data.discount)}</span>
              </div>
            )}
            <div className="mt-2 flex items-center justify-between rounded-full bg-[#c8632f] px-5 py-2.5 text-white">
              <span className="text-[11.5px] font-bold">À régler</span>
              <span className="font-mono text-lg font-bold">{money(data.total)}</span>
            </div>
          </div>
        </div>

        {/* Pied de page */}
        <p className="mt-8 text-center font-serif italic text-[#c8632f]">{data.footerMessage ?? "Merci de votre visite, à bientôt"}</p>
        {(data.mobileMoneyInfo || data.ifu || data.rccm || data.returnPolicy) && (
          <p className="mt-1.5 text-center text-[10px] text-[#8a6f5e]">
            {[
              data.mobileMoneyInfo ? `Mobile money ${data.mobileMoneyInfo}` : null,
              data.ifu ? `IFU ${data.ifu}` : null,
              data.rccm ? `RCCM ${data.rccm}` : null,
              data.returnPolicy,
            ]
              .filter(Boolean)
              .join("  ·  ")}
          </p>
        )}
      </div>
    </>
  );
}
