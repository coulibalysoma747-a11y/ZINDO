import { formatMoney, formatLongDate } from "@/lib/format";
import type { FactureData } from "./Facture";

/**
 * Facture A4 — variante "Grossiste" : ledger noir & blanc à forte densité,
 * filets épais façon bon de livraison. Pensée pour la vente en gros/demi-gros
 * (grossiste, dépôt/entrepôt, quincaillerie), où le document liste souvent
 * beaucoup de lignes et doit rester lisible même dense. Sixième modèle du
 * sélecteur (voir lib/invoice-templates.ts), même FactureData que les autres.
 */
export function FactureGrossiste({ data }: { data: FactureData }) {
  const currency = data.currency ?? "XOF";
  const money = (v: number) => formatMoney(v, currency);
  const documentTitle = data.documentTitle ?? "Facture de gros";

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4; margin: 14mm; }
          html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
          #zindo-facture-grossiste { width: 100%; margin: 0; box-shadow: none; border: none; }
        }
      `}</style>

      <div
        id="zindo-facture-grossiste"
        className="mx-auto w-full max-w-[210mm] rounded-2xl border border-zinc-200 bg-white p-11 font-sans text-[#14171c] shadow-sm"
      >
        {/* En-tête */}
        <div className="flex items-start justify-between gap-6 border-b-[3px] border-black pb-4">
          <div>
            <p className="text-lg font-bold uppercase tracking-wide">{data.businessName}</p>
            <div className="mt-1 space-y-0.5 text-[10.5px] leading-relaxed text-[#5c6270]">
              {(data.locationAddress ?? data.businessAddress) && <p>{data.locationAddress ?? data.businessAddress}</p>}
              {(data.businessPhone || data.businessEmail) && <p>{[data.businessPhone, data.businessEmail].filter(Boolean).join(" · ")}</p>}
              {(data.ifu || data.rccm) && (
                <p className="italic text-[#8b93a3]">
                  {[data.ifu ? `IFU ${data.ifu}` : null, data.rccm ? `RCCM ${data.rccm}` : null].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xl font-extrabold uppercase tracking-wide">{documentTitle}</p>
            <p className="mt-1 font-mono text-[12.5px] font-semibold">{data.invoiceNumber}</p>
            <p className="mt-1.5 text-[10.5px] text-[#5c6270]">{formatLongDate(data.date)}</p>
          </div>
        </div>

        {/* Client */}
        <div className="mt-4 flex justify-between gap-4 border-b border-[#d8dbe0] pb-3">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wide text-[#5c6270]">{data.partyLabel ?? "Client"}</p>
            <p className="mt-0.5 text-[13.5px] font-bold">{data.customerName ?? "Client de passage"}</p>
            {data.customerPhone && <p className="text-[10.5px] text-[#5c6270]">{data.customerPhone}</p>}
          </div>
          <div className="text-right">
            <p className="text-[9px] font-bold uppercase tracking-wide text-[#5c6270]">Règlement</p>
            <p className="mt-0.5 text-[13px] font-semibold">{data.paymentMethodLabel ?? "—"}</p>
            {data.statusLabel && <p className="text-[10.5px] text-[#5c6270]">{data.statusLabel}</p>}
          </div>
        </div>

        {/* Articles */}
        <table className="mt-3 w-full border-collapse text-[11px]">
          <thead>
            <tr className="text-[9px] font-bold uppercase tracking-wide">
              <th className="border-y-2 border-black px-1.5 py-2 text-left">Article</th>
              <th className="border-y-2 border-black px-1.5 py-2 text-center">Qté</th>
              <th className="border-y-2 border-black px-1.5 py-2 text-right">P.U.</th>
              <th className="border-y-2 border-black px-1.5 py-2 text-right">Montant</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, i) => (
              <tr key={i} className="border-b border-[#d8dbe0]">
                <td className="px-1.5 py-1.5 font-medium">
                  {item.name}
                  {item.reference && <span className="ml-1.5 font-mono text-[9px] text-[#8b93a3]">{item.reference}</span>}
                </td>
                <td className="px-1.5 py-1.5 text-center">{item.quantity}</td>
                <td className="px-1.5 py-1.5 text-right font-mono">{money(item.unitPrice)}</td>
                <td className="px-1.5 py-1.5 text-right font-mono font-semibold">{money(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totaux */}
        <div className="mt-4 flex justify-end">
          <div className="w-64">
            <div className="flex justify-between px-1 py-0.5 text-[11px] text-[#5c6270]">
              <span>Total HT</span>
              <span className="font-mono">{money(data.subtotal)}</span>
            </div>
            {!!data.discount && data.discount > 0 && (
              <div className="flex justify-between px-1 py-0.5 text-[11px] text-[#5c6270]">
                <span>Remise</span>
                <span className="font-mono">− {money(data.discount)}</span>
              </div>
            )}
            <div className="mt-1.5 flex justify-between border-[2.5px] border-black px-3 py-2 text-base font-extrabold">
              <span>TOTAL</span>
              <span className="font-mono">{money(data.total)}</span>
            </div>
          </div>
        </div>

        {/* Pied de page */}
        <div className="mt-8 flex items-end justify-between gap-4 border-t border-[#d8dbe0] pt-3 text-[10px] text-[#5c6270]">
          <p className="max-w-sm leading-relaxed">
            {[data.footerMessage ?? "Marchandise vérifiée à la livraison.", data.mobileMoneyInfo ? `Mobile money ${data.mobileMoneyInfo}` : null, data.returnPolicy]
              .filter(Boolean)
              .join(" — ")}
          </p>
          <div className="flex items-end gap-3">
            {data.qrCodeDataUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.qrCodeDataUrl} alt="QR code de vérification" width={50} height={50} />
            )}
            {data.signerName && (
              <div className="text-right">
                <div className="mb-7 w-36 border-t border-[#d8dbe0]" />
                {data.signerName}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
