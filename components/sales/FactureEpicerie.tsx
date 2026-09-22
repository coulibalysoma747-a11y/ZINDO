import { formatMoney, formatLongDate } from "@/lib/format";
import type { FactureData } from "./Facture";

/**
 * Facture A4 — variante "Épicerie" : blanc/vert frais, grille dense façon
 * ticket de supermarché élargi. Pensée pour le supermarché/alimentation, où
 * les tickets comptent souvent beaucoup de petites lignes et doivent rester
 * lisibles rapidement. Neuvième modèle du sélecteur (voir
 * lib/invoice-templates.ts), même FactureData que les autres.
 */
export function FactureEpicerie({ data }: { data: FactureData }) {
  const currency = data.currency ?? "XOF";
  const money = (v: number) => formatMoney(v, currency);
  const documentTitle = data.documentTitle ?? "Facture";

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4; margin: 14mm; }
          html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
          #zindo-facture-epicerie { width: 100%; margin: 0; box-shadow: none; border: none; }
          #zindo-facture-epicerie, #zindo-facture-epicerie * {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>

      <div
        id="zindo-facture-epicerie"
        className="mx-auto w-full max-w-[210mm] rounded-2xl border border-zinc-200 bg-white p-10 font-sans text-[#173226] shadow-sm"
      >
        {/* En-tête */}
        <div className="flex items-center justify-between gap-4 rounded-xl bg-[#2f8f4e] px-5 py-4 text-white">
          <div>
            <p className="text-lg font-extrabold">{data.businessName}</p>
            {(data.locationAddress ?? data.businessAddress) && (
              <p className="mt-0.5 text-[10.5px] text-[#d7ecdc]">{data.locationAddress ?? data.businessAddress}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-[10.5px] font-semibold uppercase tracking-wide text-[#d7ecdc]">{documentTitle}</p>
            <p className="font-mono text-sm font-bold">{data.invoiceNumber}</p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap justify-between gap-2 text-[10.5px] text-[#4c7a5d]">
          <span>{formatLongDate(data.date)}</span>
          <span>
            {data.partyLabel ?? "Client"} : {data.customerName ?? "Client de passage"}
          </span>
          {data.paymentMethodLabel && <span>{data.paymentMethodLabel}</span>}
        </div>

        {/* Articles — grille dense */}
        <div className="mt-4">
          <div className="grid grid-cols-[1fr_50px_80px_90px] gap-2 rounded-t-lg bg-[#eaf6ee] px-2.5 py-2 text-[9px] font-bold uppercase tracking-wide text-[#2f8f4e]">
            <span>Produit</span>
            <span className="text-center">Qté</span>
            <span className="text-right">P.U.</span>
            <span className="text-right">Montant</span>
          </div>
          {data.items.map((item, i) => (
            <div
              key={i}
              className={`grid grid-cols-[1fr_50px_80px_90px] gap-2 px-2.5 py-1.5 text-[11px] ${i % 2 === 0 ? "bg-[#f5fbf6]" : ""}`}
            >
              <span>{item.name}</span>
              <span className="text-center font-mono">{item.quantity}</span>
              <span className="text-right font-mono">{money(item.unitPrice)}</span>
              <span className="text-right font-mono font-semibold">{money(item.total)}</span>
            </div>
          ))}
        </div>

        {/* Totaux */}
        <div className="mt-4 flex justify-end">
          <div className="w-56">
            <div className="flex justify-between px-1 py-1 text-[11px] text-[#4c7a5d]">
              <span>Sous-total</span>
              <span className="font-mono">{money(data.subtotal)}</span>
            </div>
            {!!data.discount && data.discount > 0 && (
              <div className="flex justify-between px-1 py-1 text-[11px] text-[#4c7a5d]">
                <span>Remise</span>
                <span className="font-mono">− {money(data.discount)}</span>
              </div>
            )}
            <div className="mt-1.5 flex items-center justify-between rounded-lg bg-[#173226] px-4 py-2.5 text-white">
              <span className="text-[11px] font-bold">Total</span>
              <span className="font-mono text-lg font-bold">{money(data.total)}</span>
            </div>
          </div>
        </div>

        {/* Pied de page */}
        <p className="mt-7 text-center text-[11px] font-semibold text-[#2f8f4e]">
          {data.footerMessage ?? "Merci pour vos achats !"}
        </p>
        {(data.mobileMoneyInfo || data.ifu || data.rccm) && (
          <p className="mt-1 text-center text-[10px] text-[#4c7a5d]">
            {[data.mobileMoneyInfo ? `Mobile money ${data.mobileMoneyInfo}` : null, data.ifu ? `IFU ${data.ifu}` : null, data.rccm ? `RCCM ${data.rccm}` : null]
              .filter(Boolean)
              .join("  ·  ")}
          </p>
        )}
      </div>
    </>
  );
}
