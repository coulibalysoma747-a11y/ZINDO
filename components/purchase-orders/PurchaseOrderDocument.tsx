/* eslint-disable @next/next/no-img-element -- document imprimé : <img> garantit le rendu à l'impression/PDF. */
import { formatMoney, formatLongDate, numberToFrenchWords } from "@/lib/format";
import { isConfirmedOrder, purchaseOrderDisplayNumber } from "@/lib/purchase-orders";
import { ZINDO_SITE, ZINDO_WHATSAPP } from "@/lib/referral";
import type { PurchaseOrderDocumentData } from "@/lib/purchase-order-document";
import { PoweredByZindo } from "@/components/branding/PoweredByZindo";

/**
 * Demande de prix (sans prix) ou bon de commande A4 — partagé entre la page
 * interne (/achats/commandes/[id]/document) et le lien public envoyé au
 * fournisseur par WhatsApp (/d/[token]).
 */
export function PurchaseOrderDocument({ data }: { data: PurchaseOrderDocumentData }) {
  const { order, business, custom, qrDataUrl } = data;
  const confirmed = isConfirmedOrder(order.status);
  const title = confirmed ? "BON DE COMMANDE" : "DEMANDE DE PRIX";
  const displayNumber = purchaseOrderDisplayNumber(order.number, order.status);
  const subtotal = order.items.reduce((s, i) => s + i.quantity * (i.unitPrice ?? 0), 0);
  const total = subtotal - (order.discount ?? 0) + (order.transportCost ?? 0);
  const currency = business.currency === "XOF" ? "francs CFA" : business.currency;
  const dotted = <span className="text-zinc-300">....................</span>;

  return (
    <div className="mx-auto max-w-[210mm] bg-white p-8 text-zinc-900 shadow-sm print:p-0 print:shadow-none">
      <style>{`@page { size: A4; margin: 12mm; }`}</style>

      {/* En-tête */}
      <div className="flex items-start justify-between gap-6 border-b-2 border-zinc-900 pb-4">
        <div className="flex gap-3">
          {business.logoUrl && <img src={business.logoUrl} alt="" className="h-16 w-16 object-contain" />}
          <div className="text-xs leading-relaxed">
            <p className="text-lg font-bold uppercase">{business.name}</p>
            {business.address && <p>{business.address}</p>}
            {business.city && <p>{business.city}</p>}
            {business.phone && <p>Tél : {business.phone}</p>}
            {custom.ifu && <p>IFU : {custom.ifu}</p>}
            {custom.rccm && <p>RCCM : {custom.rccm}</p>}
          </div>
        </div>
        <div className="text-right text-xs leading-relaxed">
          <p className="text-xl font-extrabold tracking-wide">{title}</p>
          <p className="font-mono font-semibold">N° {displayNumber}</p>
          {confirmed && <p className="text-zinc-500">Réf. demande DP-{order.number}</p>}
          <p>Date : {formatLongDate(new Date(confirmed && order.confirmedAt ? order.confirmedAt : order.createdAt))}</p>
          {!confirmed && order.responseBy && <p>Réponse souhaitée : {formatLongDate(new Date(order.responseBy))}</p>}
        </div>
      </div>

      {/* Destinataire */}
      <div className="mt-4 rounded-lg border border-zinc-300 p-3 text-xs">
        <p className="mb-1 font-semibold uppercase text-zinc-500">Destinataire</p>
        <p className="text-sm font-bold">{order.supplier.company || order.supplier.name}</p>
        {order.supplier.company && <p>{order.supplier.name}</p>}
        {order.supplier.address && <p>{order.supplier.address}</p>}
        {order.supplier.phone && <p>Tél : {order.supplier.phone}</p>}
      </div>

      {/* Tableau */}
      <table className="mt-5 w-full border-collapse text-xs">
        <thead>
          <tr className="bg-zinc-900 text-white" style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>
            <th className="border border-zinc-900 px-2 py-1.5 text-left">N°</th>
            <th className="border border-zinc-900 px-2 py-1.5 text-left">Réf.</th>
            <th className="border border-zinc-900 px-2 py-1.5 text-left">Désignation</th>
            <th className="border border-zinc-900 px-2 py-1.5 text-center">Cartons</th>
            <th className="border border-zinc-900 px-2 py-1.5 text-center">Unités</th>
            <th className="border border-zinc-900 px-2 py-1.5 text-right">P.U.</th>
            <th className="border border-zinc-900 px-2 py-1.5 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item, i) => {
            const upc = item.product.unitsPerCarton && item.product.unitsPerCarton > 1 ? item.product.unitsPerCarton : null;
            return (
              <tr key={i}>
                <td className="border border-zinc-300 px-2 py-2">{i + 1}</td>
                <td className="border border-zinc-300 px-2 py-2 font-mono">{item.product.reference}</td>
                <td className="border border-zinc-300 px-2 py-2">{item.product.name}</td>
                <td className="border border-zinc-300 px-2 py-2 text-center">
                  {upc ? `${Math.floor(item.quantity / upc)} (×${upc})` : "—"}
                </td>
                <td className="border border-zinc-300 px-2 py-2 text-center">
                  {item.quantity} {item.product.unit}
                </td>
                <td className="border border-zinc-300 px-2 py-2 text-right">
                  {confirmed && item.unitPrice != null ? formatMoney(item.unitPrice, business.currency) : dotted}
                </td>
                <td className="border border-zinc-300 px-2 py-2 text-right">
                  {confirmed && item.unitPrice != null ? formatMoney(item.unitPrice * item.quantity, business.currency) : dotted}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Totaux */}
      <div className="mt-3 flex justify-end">
        <table className="w-72 text-xs">
          <tbody>
            {confirmed ? (
              <>
                <tr>
                  <td className="py-0.5">Sous-total</td>
                  <td className="py-0.5 text-right">{formatMoney(subtotal, business.currency)}</td>
                </tr>
                {order.discount > 0 && (
                  <tr>
                    <td className="py-0.5">Remise</td>
                    <td className="py-0.5 text-right">−{formatMoney(order.discount, business.currency)}</td>
                  </tr>
                )}
                <tr>
                  <td className="py-0.5">Transport</td>
                  <td className="py-0.5 text-right">{formatMoney(order.transportCost ?? 0, business.currency)}</td>
                </tr>
                <tr className="border-t-2 border-zinc-900 text-sm font-bold">
                  <td className="py-1">TOTAL À PAYER</td>
                  <td className="py-1 text-right">{formatMoney(total, business.currency)}</td>
                </tr>
              </>
            ) : (
              <>
                <tr>
                  <td className="py-1">Transport</td>
                  <td className="py-1 text-right">{dotted}</td>
                </tr>
                <tr className="border-t-2 border-zinc-900 text-sm font-bold">
                  <td className="py-1">TOTAL</td>
                  <td className="py-1 text-right">{dotted}</td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>
      {confirmed && (
        <p className="mt-2 text-xs italic">
          Arrêté à la somme de : {numberToFrenchWords(Math.round(total))} {currency}.
        </p>
      )}

      {/* Conditions / consignes */}
      {confirmed ? (
        <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-1 rounded-lg border border-zinc-300 p-3 text-xs">
          <p className="col-span-2 mb-1 font-semibold uppercase text-zinc-500">Conditions</p>
          <p>Livraison prévue : {order.expectedDeliveryDate ? formatLongDate(new Date(order.expectedDeliveryDate)) : "à convenir"}</p>
          <p>Lieu de livraison : {order.deliveryPlace || `${order.location.name}${order.location.city ? `, ${order.location.city}` : ""}`}</p>
          <p>Paiement : {order.paymentTerms || "à convenir"}</p>
          {order.deposit > 0 && <p>Acompte versé : {formatMoney(order.deposit, business.currency)}</p>}
          {order.note && <p className="col-span-2">Remarque : {order.note}</p>}
        </div>
      ) : (
        <div className="mt-5 space-y-2 text-xs">
          <p className="font-medium">
            Merci de nous indiquer vos prix unitaires, les frais de transport et la disponibilité de chaque article.
          </p>
          {order.note && <p>Remarque : {order.note}</p>}
          <p className="pt-2">Disponibilité / remarques du fournisseur :</p>
          <p className="text-zinc-300">
            ..............................................................................................................................................................
          </p>
          <p className="text-zinc-300">
            ..............................................................................................................................................................
          </p>
        </div>
      )}

      {/* Signatures */}
      <div className="mt-8 grid grid-cols-2 gap-8 text-xs">
        {confirmed ? (
          <>
            <div>
              <p className="font-semibold">Le commerçant</p>
              <p className="text-zinc-500">{business.name}</p>
              <div className="mt-10 border-t border-zinc-400" />
            </div>
            <div>
              <p className="font-semibold">Le fournisseur (bon pour accord)</p>
              <div className="mt-14 border-t border-zinc-400" />
            </div>
          </>
        ) : (
          <>
            <div />
            <div>
              <p className="font-semibold">Cachet et signature du fournisseur</p>
              <div className="mt-14 border-t border-zinc-400" />
            </div>
          </>
        )}
      </div>

      <PoweredByZindo
        qrDataUrl={qrDataUrl}
        site={ZINDO_SITE}
        whatsapp={ZINDO_WHATSAPP}
        label={confirmed ? "Bon créé avec ZINDO" : "Demande créée avec ZINDO"}
      />
    </div>
  );
}
