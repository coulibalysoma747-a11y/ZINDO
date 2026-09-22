import { formatMoney, formatLongDate } from "@/lib/format";
import type { FactureData } from "./Facture";

/**
 * Facture A4 — variante "Moto" : fond sombre, accent bleu vif, bandeau de
 * filets obliques en tête façon piste. Pensée pour les pièces détachées
 * auto/moto et les accessoires de boutique de motos — pour la vente d'un
 * engin en tant que tel, voir plutôt components/sales/FactureEngin.tsx
 * (document réglementaire dédié, avec châssis/moteur). Septième modèle du
 * sélecteur (voir lib/invoice-templates.ts), même FactureData que les autres.
 */
export function FactureMoto({ data }: { data: FactureData }) {
  const currency = data.currency ?? "XOF";
  const money = (v: number) => formatMoney(v, currency);
  const documentTitle = data.documentTitle ?? "Facture de vente";

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4; margin: 0; }
          html, body { margin: 0 !important; padding: 0 !important; }
          #zindo-facture-moto { width: 100%; margin: 0; box-shadow: none; border: none; border-radius: 0; }
          #zindo-facture-moto .fm-stripes { border-radius: 0; }
          #zindo-facture-moto, #zindo-facture-moto * {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>

      <div
        id="zindo-facture-moto"
        className="mx-auto w-full max-w-[210mm] overflow-hidden rounded-2xl bg-[#101418] font-sans text-[#e9edf1] shadow-sm"
      >
        <div
          className="fm-stripes h-2 w-full"
          style={{
            background:
              "repeating-linear-gradient(115deg, #3d8bfd 0 12px, #101418 12px 16px, #3d8bfd 16px 28px, #101418 28px 32px)",
          }}
        />

        <div className="px-10 py-8">
          {/* En-tête */}
          <div className="flex items-start justify-between gap-6 border-b border-[#232a33] pb-5">
            <div>
              <p className="text-xl font-semibold uppercase tracking-wide">{data.businessName}</p>
              {(data.tagline || data.businessActivity) && (
                <p className="mt-1 text-[10.5px] text-[#8f9aa8]">{data.tagline ?? data.businessActivity}</p>
              )}
              <p className="mt-2 text-[10.5px] leading-relaxed text-[#8f9aa8]">
                {[data.locationAddress ?? data.businessAddress, data.businessPhone].filter(Boolean).join(" · ")}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#3d8bfd]">{documentTitle}</p>
              <p className="mt-1.5 font-mono text-sm font-semibold">{data.invoiceNumber}</p>
              <p className="mt-1.5 text-[10.5px] text-[#8f9aa8]">{formatLongDate(data.date)}</p>
            </div>
          </div>

          {/* Client / règlement */}
          <div className="mt-4 grid grid-cols-2 gap-4 rounded-xl border border-[#232a33] bg-[#171c22] px-4 py-3">
            <div>
              <p className="text-[9px] uppercase tracking-widest text-[#8f9aa8]">{data.partyLabel ?? "Client"}</p>
              <p className="mt-1 text-[12.5px] font-semibold">{data.customerName ?? "Client de passage"}</p>
              {data.customerPhone && <p className="text-[10.5px] text-[#8f9aa8]">{data.customerPhone}</p>}
            </div>
            <div className="text-right">
              <p className="text-[9px] uppercase tracking-widest text-[#8f9aa8]">Règlement</p>
              <p className="mt-1 text-[12.5px] font-semibold">{data.paymentMethodLabel ?? "—"}</p>
              {data.statusLabel && <p className="text-[10.5px] text-[#8f9aa8]">{data.statusLabel}</p>}
            </div>
          </div>

          {/* Articles */}
          <table className="mt-5 w-full border-collapse text-[11.5px]">
            <thead>
              <tr className="text-[9px] uppercase tracking-widest text-[#8f9aa8]">
                <th className="border-b border-[#3d8bfd] px-2 py-2 text-left font-medium">Désignation</th>
                <th className="border-b border-[#3d8bfd] px-2 py-2 text-center font-medium">Qté</th>
                <th className="border-b border-[#3d8bfd] px-2 py-2 text-right font-medium">P.U.</th>
                <th className="border-b border-[#3d8bfd] px-2 py-2 text-right font-medium">Montant</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item, i) => (
                <tr key={i} className="border-b border-[#232a33]">
                  <td className="px-2 py-2.5">
                    {item.name}
                    {item.reference && <span className="ml-1.5 font-mono text-[9.5px] text-[#8f9aa8]">{item.reference}</span>}
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
              <div className="flex justify-between px-1 py-1 text-[11.5px] text-[#8f9aa8]">
                <span>Sous-total</span>
                <span className="font-mono">{money(data.subtotal)}</span>
              </div>
              {!!data.discount && data.discount > 0 && (
                <div className="flex justify-between px-1 py-1 text-[11.5px] text-[#8f9aa8]">
                  <span>Remise</span>
                  <span className="font-mono">− {money(data.discount)}</span>
                </div>
              )}
              <div className="mt-2 flex items-center justify-between rounded-lg bg-[#3d8bfd] px-4 py-3 text-[#0a1420]">
                <span className="text-[11px] font-bold uppercase tracking-wide">Total</span>
                <span className="font-mono text-lg font-bold">{money(data.total)}</span>
              </div>
            </div>
          </div>

          {/* Pied de page */}
          <div className="mt-8 flex items-end justify-between gap-4 border-t border-[#232a33] pt-4 text-[10.5px] text-[#8f9aa8]">
            <p className="max-w-sm leading-relaxed">
              {[
                data.footerMessage,
                data.mobileMoneyInfo ? `Mobile money ${data.mobileMoneyInfo}` : null,
                data.ifu ? `IFU ${data.ifu}` : null,
                data.rccm ? `RCCM ${data.rccm}` : null,
                data.returnPolicy,
              ]
                .filter(Boolean)
                .join(" — ")}
            </p>
            {data.signerName && (
              <div className="text-right">
                <div className="mb-7 w-36 border-t border-[#232a33]" />
                {data.signerName}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
