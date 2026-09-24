import { formatMoney, formatLongDate, numberToFrenchWords } from "@/lib/format";
import type { FactureData } from "./Facture";

export type EleganteVariant = "prestige" | "royal" | "ivoire" | "emeraude" | "bordeaux";

type Theme = {
  /** Couleur principale (bandeau, titres). */
  ink: string;
  /** Filets et détails dorés/champagne. */
  accent: string;
  /** Fond du document. */
  paper: string;
  /** Fond des lignes paires du tableau. */
  zebra: string;
  /** En-tête en bandeau plein (texte clair) plutôt que centré sur fond papier. */
  banner: boolean;
};

const THEMES: Record<EleganteVariant, Theme> = {
  prestige: { ink: "#111111", accent: "#b8963e", paper: "#ffffff", zebra: "#faf7f0", banner: true },
  royal: { ink: "#14213d", accent: "#c9a227", paper: "#ffffff", zebra: "#f5f6fa", banner: true },
  ivoire: { ink: "#3b3024", accent: "#a88b5c", paper: "#fdfaf3", zebra: "#f6f0e2", banner: false },
  emeraude: { ink: "#0f3d2e", accent: "#bfa05a", paper: "#ffffff", zebra: "#f2f7f4", banner: true },
  bordeaux: { ink: "#5a1a2b", accent: "#d4b483", paper: "#fffdfa", zebra: "#faf3f0", banner: false },
};

/**
 * Facture A4 — famille "Élégant" : cinq déclinaisons haut de gamme (voir
 * lib/invoice-templates.ts) qui partagent une même mise en page serif à
 * filets dorés et ne diffèrent que par leur palette et le style d'en-tête
 * (bandeau plein ou en-tête centré). Même `FactureData` que les autres
 * modèles, donc interchangeable via components/sales/InvoiceDocument.tsx.
 */
export function FactureElegante({ data, variant }: { data: FactureData; variant: EleganteVariant }) {
  const t = THEMES[variant];
  const currency = data.currency ?? "XOF";
  const money = (v: number) => formatMoney(v, currency);
  const currencyWord = currency === "XOF" ? "Francs CFA" : currency;
  const documentTitle = data.documentTitle ?? "Facture";
  const address = data.locationAddress ?? data.businessAddress;
  const legal = [data.ifu ? `IFU ${data.ifu}` : null, data.rccm ? `RCCM ${data.rccm}` : null].filter(Boolean).join("  ·  ");
  const contact = [data.businessPhone ? `Tél : ${data.businessPhone}` : null, data.businessEmail].filter(Boolean).join("  ·  ");
  const id = `zindo-facture-${variant}`;

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4; margin: 12mm; }
          html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
          #${id} { width: 100%; margin: 0; box-shadow: none; border: none; }
          #${id}, #${id} * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      <div
        id={id}
        className="mx-auto w-full max-w-[210mm] overflow-hidden rounded-2xl border border-zinc-200 font-serif shadow-sm"
        style={{ background: t.paper, color: t.ink }}
      >
        {/* En-tête */}
        {t.banner ? (
          <div className="flex items-center justify-between gap-6 px-12 py-8" style={{ background: t.ink, color: "#fff" }}>
            <div className="flex items-center gap-4">
              {data.logoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={data.logoUrl} alt={data.businessName} className="h-14 w-14 rounded-full bg-white object-contain p-1" />
              )}
              <div>
                <p className="text-2xl font-bold uppercase tracking-[0.18em]">{data.businessName}</p>
                {data.tagline && <p className="mt-1 text-sm italic" style={{ color: t.accent }}>{data.tagline}</p>}
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-light uppercase tracking-[0.3em]" style={{ color: t.accent }}>{documentTitle}</p>
              <p className="mt-1 font-mono text-sm opacity-80">N° {data.invoiceNumber}</p>
            </div>
          </div>
        ) : (
          <div className="px-12 pt-10 text-center">
            {data.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.logoUrl} alt={data.businessName} className="mx-auto mb-3 h-16 w-16 object-contain" />
            )}
            <p className="text-3xl font-bold uppercase tracking-[0.22em]">{data.businessName}</p>
            {data.tagline && <p className="mt-1 text-sm italic" style={{ color: t.accent }}>{data.tagline}</p>}
            <div className="mx-auto mt-4 flex items-center justify-center gap-3">
              <span className="h-px w-16" style={{ background: t.accent }} />
              <span className="text-xs" style={{ color: t.accent }}>◆</span>
              <span className="h-px w-16" style={{ background: t.accent }} />
            </div>
          </div>
        )}
        <div className="h-1" style={{ background: t.accent }} />

        <div className="px-12 pb-10 pt-7">
          {/* Coordonnées du commerce */}
          <div className={`space-y-0.5 text-xs leading-relaxed opacity-80 ${t.banner ? "" : "text-center"}`}>
            {data.businessActivity && <p className="font-semibold uppercase tracking-[0.12em]">{data.businessActivity}</p>}
            {address && <p>{address}</p>}
            {contact && <p>{contact}</p>}
            {data.mobileMoneyInfo && <p>Mobile money {data.mobileMoneyInfo}</p>}
            {legal && <p>{legal}</p>}
          </div>

          {!t.banner && (
            <div className="mt-6 text-center">
              <p className="text-2xl font-light uppercase tracking-[0.35em]">{documentTitle}</p>
              <p className="mt-1 font-mono text-sm opacity-70">N° {data.invoiceNumber}</p>
            </div>
          )}

          {/* Client + dates */}
          <div className="mt-7 grid grid-cols-2 gap-6">
            <div className="border-l-2 pl-4" style={{ borderColor: t.accent }}>
              <p className="text-[10px] uppercase tracking-[0.16em] opacity-60">{data.partyLabel ?? "Facturé à"}</p>
              <p className="mt-1 text-base font-semibold">{data.customerName ?? "Client de passage"}</p>
              {data.customerPhone && <p className="text-xs opacity-70">{data.customerPhone}</p>}
              {data.customerAddress && <p className="text-xs opacity-70">{data.customerAddress}</p>}
            </div>
            <div className="space-y-1 text-right text-xs">
              <p>
                <span className="opacity-60">Date : </span>
                {(data.businessCity ?? data.locationName) ? `${data.businessCity ?? data.locationName}, ` : ""}
                {formatLongDate(data.date)}
              </p>
              {data.validUntil && (
                <p>
                  <span className="opacity-60">Valable jusqu&apos;au : </span>
                  {formatLongDate(data.validUntil)}
                </p>
              )}
              {!data.validUntil && data.paymentMethodLabel && (
                <p>
                  <span className="opacity-60">Paiement : </span>
                  {data.paymentMethodLabel}
                </p>
              )}
              {data.cashierName && (
                <p>
                  <span className="opacity-60">Vendeur : </span>
                  {data.cashierName}
                </p>
              )}
            </div>
          </div>

          {/* Articles */}
          <table className="mt-7 w-full border-collapse text-sm">
            <thead>
              <tr style={{ borderBottom: `2px solid ${t.accent}` }}>
                <th className="py-2 text-left text-[10px] font-semibold uppercase tracking-[0.14em] opacity-70">Désignation</th>
                <th className="py-2 text-center text-[10px] font-semibold uppercase tracking-[0.14em] opacity-70">Qté</th>
                <th className="py-2 text-right text-[10px] font-semibold uppercase tracking-[0.14em] opacity-70">Prix unitaire</th>
                <th className="py-2 text-right text-[10px] font-semibold uppercase tracking-[0.14em] opacity-70">Montant</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item, i) => (
                <tr key={i} style={{ background: i % 2 === 1 ? t.zebra : "transparent" }}>
                  <td className="px-2 py-2.5">
                    <span className="font-medium">{item.name}</span>
                    {item.reference && <span className="block font-mono text-[10px] opacity-50">{item.reference}</span>}
                  </td>
                  <td className="py-2.5 text-center tabular-nums">
                    {item.quantity}
                    {item.unit ? <span className="text-xs opacity-60"> {item.unit}</span> : null}
                  </td>
                  <td className="py-2.5 text-right tabular-nums">{money(item.unitPrice)}</td>
                  <td className="px-2 py-2.5 text-right font-semibold tabular-nums">{money(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totaux */}
          <div className="mt-6 flex justify-end">
            <div className="w-72 text-sm">
              <div className="flex justify-between py-1 opacity-70">
                <span>Sous-total</span>
                <span className="tabular-nums">{money(data.subtotal)}</span>
              </div>
              {!!data.discount && data.discount > 0 && (
                <div className="flex justify-between py-1 opacity-70">
                  <span>Remise</span>
                  <span className="tabular-nums">− {money(data.discount)}</span>
                </div>
              )}
              <div
                className="mt-2 flex items-baseline justify-between px-4 py-3"
                style={{ background: t.ink, color: "#fff" }}
              >
                <span className="text-[11px] uppercase tracking-[0.2em]" style={{ color: t.accent }}>Total</span>
                <span className="text-xl font-bold tabular-nums">{money(data.total)}</span>
              </div>
              {!!data.amountPaid && data.amountPaid > 0 && !data.validUntil && (
                <div className="flex justify-between pt-2 text-xs opacity-70">
                  <span>Montant versé</span>
                  <span className="tabular-nums">{money(data.amountPaid)}</span>
                </div>
              )}
              {!!data.remaining && data.remaining > 0 && (
                <div className="flex justify-between text-xs font-semibold">
                  <span>Reste à payer</span>
                  <span className="tabular-nums">{money(data.remaining)}</span>
                </div>
              )}
              {data.statusLabel && <p className="mt-1 text-right text-[10px] italic opacity-60">{data.statusLabel}</p>}
            </div>
          </div>

          <p className="mt-5 text-xs italic opacity-80">
            Arrêté{documentTitle.toLowerCase() === "devis" ? " le présent devis" : "e la présente facture"} à la somme de{" "}
            <span className="font-semibold not-italic">
              {numberToFrenchWords(data.total)} {currencyWord}
            </span>
            .
          </p>

          {/* Pied de page */}
          <div className="mt-10 flex items-end justify-between gap-6">
            <div className="flex items-end gap-3 text-[10px] opacity-70">
              {data.qrCodeDataUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={data.qrCodeDataUrl} alt="QR code de vérification" width={60} height={60} />
              )}
              <p className="max-w-xs leading-relaxed">{data.footerMessage ?? "Merci pour votre confiance."}</p>
            </div>
            <div className="text-center text-xs">
              <div className="mb-1 h-16 w-48 border-b" style={{ borderColor: t.accent }} />
              <p className="opacity-70">{data.signerName ?? "Cachet et signature"}</p>
            </div>
          </div>

          {data.returnPolicy && <p className="mt-6 text-[9.5px] leading-relaxed opacity-50">{data.returnPolicy}</p>}
        </div>
        <div className="h-2" style={{ background: t.ink }} />
      </div>
    </>
  );
}
