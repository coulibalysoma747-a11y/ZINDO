import { formatMoney, formatLongDate } from "@/lib/format";
import type { FactureData } from "./Facture";

/**
 * Facture A4 — variante "Pharmacie" : blanc/teal clinique, très ordonné,
 * référence produit affichée sous chaque ligne (utile pour retrouver un lot
 * ou une référence de produit de santé). Cinquième modèle du sélecteur
 * (voir lib/invoice-templates.ts), même FactureData que les autres.
 */
export function FacturePharmacie({ data }: { data: FactureData }) {
  const currency = data.currency ?? "XOF";
  const money = (v: number) => formatMoney(v, currency);
  const documentTitle = data.documentTitle ?? "Facture";

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4; margin: 14mm; }
          html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
          #zindo-facture-pharmacie { width: 100%; margin: 0; box-shadow: none; border: none; }
          #zindo-facture-pharmacie, #zindo-facture-pharmacie * {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>

      <div
        id="zindo-facture-pharmacie"
        className="mx-auto w-full max-w-[210mm] rounded-2xl border border-zinc-200 bg-white p-11 font-sans text-[#16302c] shadow-sm"
      >
        {/* En-tête */}
        <div className="flex items-start justify-between gap-6 border-b border-[#dcece8] pb-5">
          <div className="flex gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0e7c6b]">
              <span className="text-lg font-bold leading-none text-white">+</span>
            </div>
            <div>
              <p className="text-lg font-extrabold">{data.businessName}</p>
              <div className="mt-1 space-y-0.5 text-[10.5px] leading-relaxed text-[#5c7671]">
                {(data.locationAddress ?? data.businessAddress) && <p>{data.locationAddress ?? data.businessAddress}</p>}
                {(data.businessPhone || data.businessEmail) && (
                  <p>{[data.businessPhone, data.businessEmail].filter(Boolean).join(" · ")}</p>
                )}
                {(data.ifu || data.rccm) && (
                  <p>{[data.ifu ? `IFU ${data.ifu}` : null, data.rccm ? `RCCM ${data.rccm}` : null].filter(Boolean).join(" · ")}</p>
                )}
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold uppercase tracking-wide text-[#0e7c6b]">{documentTitle}</p>
            <p className="mt-1 font-mono text-sm font-semibold">{data.invoiceNumber}</p>
            <p className="mt-1.5 text-[10.5px] text-[#5c7671]">
              {formatLongDate(data.date)}
              {data.validUntil ? ` · valable jusqu'au ${formatLongDate(data.validUntil)}` : ""}
            </p>
          </div>
        </div>

        {/* Client */}
        <div className="mt-4 flex justify-between gap-4 rounded-xl bg-[#eef7f5] px-4 py-3 text-[11px]">
          <span>
            <b className="font-semibold">{data.partyLabel ?? "Client"} : </b>
            {data.customerName ?? "Client de passage"}
          </span>
          {data.customerPhone && <span>{data.customerPhone}</span>}
          {data.paymentMethodLabel && <span>{data.paymentMethodLabel}</span>}
        </div>

        {/* Articles */}
        <table className="mt-5 w-full border-collapse text-[11px]">
          <thead>
            <tr className="text-[9px] font-bold uppercase tracking-wide text-[#5c7671]">
              <th className="border-b-2 border-[#0e7c6b] px-2 py-2 text-left">Produit</th>
              <th className="border-b-2 border-[#0e7c6b] px-2 py-2 text-center">Qté</th>
              <th className="border-b-2 border-[#0e7c6b] px-2 py-2 text-right">P.U.</th>
              <th className="border-b-2 border-[#0e7c6b] px-2 py-2 text-right">Montant</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, i) => (
              <tr key={i} className="border-b border-[#dcece8]">
                <td className="px-2 py-2.5">
                  <p className="font-semibold">{item.name}</p>
                  {item.reference && <p className="mt-0.5 font-mono text-[9px] text-[#5c7671]">Réf. {item.reference}</p>}
                </td>
                <td className="px-2 py-2.5 text-center">{item.quantity}</td>
                <td className="px-2 py-2.5 text-right font-mono">{money(item.unitPrice)}</td>
                <td className="px-2 py-2.5 text-right font-mono">{money(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totaux */}
        <div className="mt-5 flex justify-end">
          <div className="w-64">
            <div className="flex justify-between px-1 py-1 text-[11px] text-[#5c7671]">
              <span>Sous-total</span>
              <span className="font-mono">{money(data.subtotal)}</span>
            </div>
            {!!data.discount && data.discount > 0 && (
              <div className="flex justify-between px-1 py-1 text-[11px] text-[#5c7671]">
                <span>Remise</span>
                <span className="font-mono">− {money(data.discount)}</span>
              </div>
            )}
            <div className="mt-1.5 flex items-center justify-between rounded-xl bg-[#0e7c6b] px-4 py-2.5 text-white">
              <span className="text-[11.5px] font-bold">Total</span>
              <span className="font-mono text-lg font-bold">{money(data.total)}</span>
            </div>
            {data.statusLabel && <p className="mt-1 text-right text-[10px] text-[#5c7671]">{data.statusLabel}</p>}
          </div>
        </div>

        {/* Pied de page */}
        <div className="mt-8 flex items-end justify-between gap-4 border-t border-[#dcece8] pt-4 text-[10px] text-[#5c7671]">
          <div className="flex items-end gap-3">
            {data.qrCodeDataUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.qrCodeDataUrl} alt="QR code de vérification" width={50} height={50} />
            )}
            <p className="max-w-sm leading-relaxed">
              {[data.footerMessage ?? "Conseil pharmaceutique donné en officine.", data.mobileMoneyInfo ? `Mobile money ${data.mobileMoneyInfo}` : null, data.returnPolicy]
                .filter(Boolean)
                .join(" — ")}
            </p>
          </div>
          {data.signerName && (
            <div className="text-right">
              <div className="mb-7 w-40 border-t border-[#dcece8]" />
              {data.signerName}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
