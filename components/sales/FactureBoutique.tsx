import { formatMoney, formatLongDate } from "@/lib/format";
import type { FactureData } from "./Facture";

/**
 * Facture A4 — variante "Boutique" : bandeau couleur plein, badge de
 * document en médaillon, articles présentés en lignes arrondies à liseré
 * coloré. Pensée pour la mode/l'habillement et les commerces qui veulent un
 * document plus chaleureux que le style "document officiel" du modèle
 * Classique. Troisième entrée du sélecteur (voir lib/invoice-templates.ts),
 * même FactureData que les autres modèles.
 */
export function FactureBoutique({ data }: { data: FactureData }) {
  const currency = data.currency ?? "XOF";
  const money = (v: number) => formatMoney(v, currency);
  const documentTitle = data.documentTitle ?? "Facture";

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4; margin: 0; }
          html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
          #zindo-facture-boutique { width: 100%; margin: 0; box-shadow: none; border: none; border-radius: 0; }
          #zindo-facture-boutique .fb-block { border-radius: 0; }
        }
      `}</style>

      <div
        id="zindo-facture-boutique"
        className="mx-auto w-full max-w-[210mm] overflow-hidden rounded-2xl border border-zinc-200 bg-white font-sans text-[#221019] shadow-sm"
      >
        {/* Bandeau */}
        <div className="fb-block relative flex items-center gap-4 bg-[#7a2454] px-10 py-7 text-white">
          {data.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.logoUrl} alt={data.businessName} className="h-12 w-12 shrink-0 rounded-lg bg-white/10 object-contain p-1" />
          )}
          <div className="flex-1">
            <p className="text-2xl font-extrabold tracking-tight">{data.businessName}</p>
            {(data.tagline || data.businessActivity) && (
              <p className="mt-1 text-sm text-[#f0d9e5]">{data.tagline ?? data.businessActivity}</p>
            )}
          </div>
          <span className="shrink-0 rounded-full bg-[#f2c14e] px-4 py-2 text-xs font-extrabold uppercase tracking-wide text-[#221019]">
            {documentTitle}
          </span>
        </div>

        <div className="px-10 py-8">
          {/* Méta */}
          <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-dashed border-[#e8d9e0] pb-5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-[#7a2454]">N° {documentTitle.toLowerCase()}</p>
              <p className="mt-1 font-mono text-sm font-semibold">{data.invoiceNumber}</p>
              <p className="mt-1 text-xs text-[#7d6270]">{formatLongDate(data.date)}</p>
              {data.validUntil && <p className="text-xs text-[#7d6270]">Valable jusqu&apos;au {formatLongDate(data.validUntil)}</p>}
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-[#7a2454]">{data.partyLabel ?? "Cliente / Client"}</p>
              <p className="mt-1 text-sm font-semibold">{data.customerName ?? "Client de passage"}</p>
              {data.customerPhone && <p className="text-xs text-[#7d6270]">{data.customerPhone}</p>}
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-wide text-[#7a2454]">Règlement</p>
              <p className="mt-1 text-sm font-semibold">{data.paymentMethodLabel ?? "—"}</p>
              {data.statusLabel && <p className="text-xs text-[#7d6270]">{data.statusLabel}</p>}
            </div>
          </div>

          {/* Articles */}
          <div className="mt-5 flex flex-col gap-2">
            {data.items.map((item, i) => (
              <div key={i} className="flex items-center gap-3 rounded-r-lg border-l-4 border-[#7a2454] bg-[#fbf5f8] px-3 py-2.5">
                <span className="flex-1 text-sm font-semibold">{item.name}</span>
                <span className="w-14 text-center font-mono text-xs text-[#7d6270]">x{item.quantity}</span>
                <span className="w-24 text-right font-mono text-sm font-semibold">{money(item.total)}</span>
              </div>
            ))}
          </div>

          {/* Totaux */}
          <div className="mt-6 flex justify-end">
            <div className="w-64">
              <div className="flex justify-between px-1 py-1 text-xs text-[#7d6270]">
                <span>Sous-total</span>
                <span className="font-mono">{money(data.subtotal)}</span>
              </div>
              {!!data.discount && data.discount > 0 && (
                <div className="flex justify-between px-1 py-1 text-xs text-[#7d6270]">
                  <span>Remise</span>
                  <span className="font-mono">− {money(data.discount)}</span>
                </div>
              )}
              <div className="mt-2 flex items-center justify-between rounded-full bg-[#7a2454] px-4 py-3 text-white">
                <span className="text-xs font-bold uppercase tracking-wide">Total</span>
                <span className="font-mono text-lg font-bold">{money(data.total)}</span>
              </div>
            </div>
          </div>

          {/* Pied de page */}
          <div className="mt-8 text-center">
            <p className="text-sm font-extrabold text-[#7a2454]">{data.footerMessage ?? "Merci pour votre confiance"}</p>
            <p className="mt-1.5 text-[10.5px] text-[#7d6270]">
              {[
                data.mobileMoneyInfo ? `Mobile money ${data.mobileMoneyInfo}` : null,
                data.ifu ? `IFU ${data.ifu}` : null,
                data.rccm ? `RCCM ${data.rccm}` : null,
              ]
                .filter(Boolean)
                .join("  ·  ")}
            </p>
            {data.returnPolicy && <p className="mt-2 text-[10px] text-[#a58e9c]">{data.returnPolicy}</p>}
          </div>

          {(data.qrCodeDataUrl || data.signerName) && (
            <div className="mt-6 flex items-center justify-between gap-4">
              {data.qrCodeDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={data.qrCodeDataUrl} alt="QR code de vérification" width={54} height={54} />
              ) : (
                <span />
              )}
              {data.signerName && (
                <div className="text-right text-xs text-[#7d6270]">
                  <div className="mb-8 w-40 border-t border-[#e8d9e0]" />
                  {data.signerName}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
