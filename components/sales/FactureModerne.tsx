import { formatMoney, formatLongDate } from "@/lib/format";
import type { FactureData } from "./Facture";

/**
 * Facture A4 — variante "Moderne" : mise en page épurée sans filets
 * décoratifs, une seule couleur d'accent réservée au total, chiffres
 * alignés en tabulaire. Deuxième entrée du sélecteur de modèle de facture
 * (voir lib/invoice-templates.ts et components/sales/InvoiceDocument.tsx),
 * même `FactureData` que le modèle Classique (components/sales/Facture.tsx)
 * pour rester interchangeable sans toucher aux deux sites de construction
 * (lib/actions/receipt.ts, lib/actions/quotes.ts).
 */
export function FactureModerne({ data }: { data: FactureData }) {
  const currency = data.currency ?? "XOF";
  const money = (v: number) => formatMoney(v, currency);
  const documentTitle = data.documentTitle ?? "Facture";

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4; margin: 16mm; }
          html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
          #zindo-facture-moderne { width: 100%; margin: 0; box-shadow: none; border: none; }
        }
      `}</style>

      <div
        id="zindo-facture-moderne"
        className="mx-auto w-full max-w-[210mm] rounded-2xl border border-zinc-200 bg-white p-12 font-sans text-[#1a1a1a] shadow-sm"
      >
        {/* En-tête : identité à gauche, document à droite */}
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-base font-bold uppercase tracking-[0.14em]">{data.businessName}</p>
            <div className="mt-1.5 space-y-0.5 text-xs leading-relaxed text-zinc-500">
              {data.tagline && <p>{data.tagline}</p>}
              {(data.locationAddress ?? data.businessAddress) && <p>{data.locationAddress ?? data.businessAddress}</p>}
              {(data.businessPhone || data.businessEmail) && (
                <p>{[data.businessPhone, data.businessEmail].filter(Boolean).join("  ·  ")}</p>
              )}
              {(data.ifu || data.rccm) && (
                <p>{[data.ifu ? `IFU ${data.ifu}` : null, data.rccm ? `RCCM ${data.rccm}` : null].filter(Boolean).join("  ·  ")}</p>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">{documentTitle}</p>
            <p className="mt-1 font-mono text-lg font-semibold">{data.invoiceNumber}</p>
          </div>
        </div>

        <div className="mt-6 h-px bg-[#1a1a1a]" />

        {/* Client / dates */}
        <div className="mt-5 grid grid-cols-3 gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-500">{data.partyLabel ?? "Client"}</p>
            <p className="mt-1 text-sm font-semibold">{data.customerName ?? "Client de passage"}</p>
            {data.customerPhone && <p className="text-xs text-zinc-500">{data.customerPhone}</p>}
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-500">Date d&apos;émission</p>
            <p className="mt-1 text-sm">{formatLongDate(data.date)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-500">
              {data.validUntil ? "Valable jusqu'au" : "Paiement"}
            </p>
            <p className="mt-1 text-sm">
              {data.validUntil ? formatLongDate(data.validUntil) : data.paymentMethodLabel ?? "—"}
            </p>
          </div>
        </div>

        {/* Articles */}
        <div className="mt-7">
          <div className="grid grid-cols-[1fr_70px_100px_110px] gap-3 border-b border-[#1a1a1a] pb-2 text-[10px] uppercase tracking-[0.1em] text-zinc-500">
            <span>Article</span>
            <span className="text-center">Qté</span>
            <span className="text-right">P.U.</span>
            <span className="text-right">Montant</span>
          </div>
          {data.items.map((item, i) => (
            <div
              key={i}
              className="grid grid-cols-[1fr_70px_100px_110px] gap-3 border-b border-zinc-100 py-2.5 text-sm items-baseline"
            >
              <span className="font-medium">{item.name}</span>
              <span className="text-center font-mono text-xs">{item.quantity}</span>
              <span className="text-right font-mono text-xs tabular-nums">{money(item.unitPrice)}</span>
              <span className="text-right font-mono text-xs tabular-nums">{money(item.total)}</span>
            </div>
          ))}
        </div>

        {/* Totaux */}
        <div className="mt-6 flex justify-end">
          <div className="w-64">
            <div className="flex justify-between py-1 text-xs text-zinc-500">
              <span>Sous-total</span>
              <span className="font-mono tabular-nums">{money(data.subtotal)}</span>
            </div>
            {!!data.discount && data.discount > 0 && (
              <div className="flex justify-between py-1 text-xs text-zinc-500">
                <span>Remise</span>
                <span className="font-mono tabular-nums">− {money(data.discount)}</span>
              </div>
            )}
            <div className="mt-2 flex items-baseline justify-between border-t-[1.5px] border-[#1a1a1a] pt-2.5">
              <span className="text-[10px] uppercase tracking-[0.1em] text-zinc-500">Total</span>
              <span className="font-mono text-2xl font-semibold text-[#2952e3]">{money(data.total)}</span>
            </div>
            {data.statusLabel && <p className="mt-1 text-right text-[10px] italic text-zinc-400">{data.statusLabel}</p>}
          </div>
        </div>

        {/* Pied de page */}
        <div className="mt-12 flex items-end justify-between gap-6 text-[10px] text-zinc-400">
          <div className="flex items-end gap-3">
            {data.qrCodeDataUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.qrCodeDataUrl} alt="QR code de vérification" width={56} height={56} />
            )}
            <p className="max-w-xs leading-relaxed">
              {[data.footerMessage ?? "Merci pour votre confiance.", data.mobileMoneyInfo ? `Mobile money ${data.mobileMoneyInfo}` : null]
                .filter(Boolean)
                .join("  ")}
            </p>
          </div>
          {data.signerName && (
            <div className="text-right">
              <div className="mb-8 w-40 border-t border-zinc-300" />
              <p className="text-zinc-600">{data.signerName}</p>
            </div>
          )}
        </div>

        {data.returnPolicy && <p className="mt-6 text-[9.5px] leading-relaxed text-zinc-400">{data.returnPolicy}</p>}
      </div>
    </>
  );
}
