import { formatMoney, formatLongDate } from "@/lib/format";
import type { FactureData } from "./Facture";

/**
 * Facture A4 — variante "Atelier" : fond sombre façon fiche d'atelier,
 * accent cuivre, cadre intérieur et coins "rivetés". Pensée pour les
 * ateliers de réparation, la chaudronnerie/menuiserie métallique et les
 * garages — un rendu plus proche d'un bon de travail que d'un document
 * comptable classique. Quatrième modèle du sélecteur (voir
 * lib/invoice-templates.ts), même FactureData que les autres.
 */
export function FactureAtelier({ data }: { data: FactureData }) {
  const currency = data.currency ?? "XOF";
  const money = (v: number) => formatMoney(v, currency);
  const documentTitle = data.documentTitle ?? "Facture travaux";

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4; margin: 0; }
          html, body { margin: 0 !important; padding: 0 !important; }
          #zindo-facture-atelier { width: 100%; margin: 0; box-shadow: none; border: none; }
          /* Sans ça, la plupart des navigateurs n'impriment pas les couleurs
             de fond par défaut — la page ressortirait blanche et vide. */
          #zindo-facture-atelier, #zindo-facture-atelier * {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>

      <div
        id="zindo-facture-atelier"
        className="mx-auto w-full max-w-[210mm] rounded-2xl bg-[#1c1a17] p-4 font-mono text-[#ece7de] shadow-sm"
      >
        <div className="relative border border-[#38342e] p-8">
          <span className="absolute left-3 top-3 h-1.5 w-1.5 rounded-full bg-[#4a453d]" />
          <span className="absolute right-3 top-3 h-1.5 w-1.5 rounded-full bg-[#4a453d]" />
          <span className="absolute bottom-3 left-3 h-1.5 w-1.5 rounded-full bg-[#4a453d]" />
          <span className="absolute bottom-3 right-3 h-1.5 w-1.5 rounded-full bg-[#4a453d]" />

          {/* En-tête */}
          <div className="flex items-start justify-between gap-4 border-b-2 border-[#c96a35] pb-4">
            <div>
              <p className="font-sans text-xl font-semibold uppercase tracking-wide">{data.businessName}</p>
              {(data.tagline || data.businessActivity) && (
                <p className="mt-1 font-sans text-[10.5px] uppercase tracking-widest text-[#c96a35]">
                  {data.tagline ?? data.businessActivity}
                </p>
              )}
              <p className="mt-2 text-[10.5px] leading-relaxed text-[#a89f8f]">
                {[data.locationAddress ?? data.businessAddress, data.businessPhone].filter(Boolean).join(" · ")}
              </p>
            </div>
            <div className="border border-[#38342e] px-3.5 py-2.5 text-right">
              <p className="font-sans text-[11px] uppercase tracking-widest text-[#a89f8f]">{documentTitle}</p>
              <p className="mt-1 text-sm font-semibold text-[#c96a35]">{data.invoiceNumber}</p>
              <p className="mt-1.5 text-[10.5px] text-[#a89f8f]">{formatLongDate(data.date)}</p>
            </div>
          </div>

          {/* Client */}
          <div className="mt-4 grid grid-cols-2 gap-5 pb-4">
            <div>
              <p className="font-sans text-[10px] uppercase tracking-widest text-[#c96a35]">{data.partyLabel ?? "Client"}</p>
              <p className="mt-1 text-[13px] font-semibold">{data.customerName ?? "Client de passage"}</p>
              {data.customerPhone && <p className="text-[10.5px] text-[#a89f8f]">{data.customerPhone}</p>}
            </div>
            <div>
              <p className="font-sans text-[10px] uppercase tracking-widest text-[#c96a35]">Règlement</p>
              <p className="mt-1 text-[13px] font-semibold">{data.paymentMethodLabel ?? "À la livraison"}</p>
              {data.statusLabel && <p className="text-[10.5px] text-[#a89f8f]">{data.statusLabel}</p>}
            </div>
          </div>

          {/* Articles */}
          <table className="mt-1 w-full border-collapse text-[11px]">
            <thead>
              <tr className="border-b border-[#c96a35] font-sans text-[9.5px] uppercase tracking-widest text-[#a89f8f]">
                <th className="py-2 text-left font-medium">Désignation</th>
                <th className="py-2 text-center font-medium">Qté</th>
                <th className="py-2 text-right font-medium">P.U.</th>
                <th className="py-2 text-right font-medium">Montant</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item, i) => (
                <tr key={i} className={i % 2 === 0 ? "bg-[#221f1b]" : ""}>
                  <td className="px-1 py-2">{item.name}</td>
                  <td className="px-1 py-2 text-center">{item.quantity}</td>
                  <td className="px-1 py-2 text-right">{money(item.unitPrice)}</td>
                  <td className="px-1 py-2 text-right">{money(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totaux */}
          <div className="mt-4 flex justify-end">
            <div className="w-64 border-t-2 border-[#c96a35] pt-2.5">
              <div className="flex justify-between py-1 text-[11.5px] text-[#a89f8f]">
                <span>Sous-total</span>
                <span>{money(data.subtotal)}</span>
              </div>
              {!!data.discount && data.discount > 0 && (
                <div className="flex justify-between py-1 text-[11.5px] text-[#a89f8f]">
                  <span>Remise</span>
                  <span>− {money(data.discount)}</span>
                </div>
              )}
              <div className="mt-2 flex justify-between border-t border-[#38342e] pt-2 text-[15px] font-semibold text-[#c96a35]">
                <span>Total</span>
                <span>{money(data.total)}</span>
              </div>
            </div>
          </div>

          {/* Pied de page */}
          <div className="mt-9 flex items-end justify-between gap-4 text-[10.5px] text-[#a89f8f]">
            <p className="max-w-xs leading-relaxed">
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
            <div className="flex h-[88px] w-[88px] shrink-0 items-center justify-center rounded-full border border-dashed border-[#c96a35] text-center font-sans text-[9px] uppercase tracking-widest text-[#c96a35]">
              Cachet
              <br />
              atelier
            </div>
          </div>
          {data.signerName && <p className="mt-2 text-right text-[10.5px] text-[#a89f8f]">{data.signerName}</p>}
        </div>
      </div>
    </>
  );
}
