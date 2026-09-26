/* eslint-disable @next/next/no-img-element -- document imprimé : <img> garantit le rendu à l'impression/PDF. */
import { formatMoney, formatDate, formatDateTime, formatLongDate, numberToFrenchWords } from "@/lib/format";
import type { StatementData } from "@/lib/client-documents";
import { PAYMENT_METHOD_LABELS } from "@/lib/payment-method-labels";
import { FitToWidth } from "@/components/purchase-orders/FitToWidth";

const STATUS_LABELS: Record<string, string> = {
  PAYEE: "Payée",
  PARTIELLE: "Partielle",
  CREDIT: "Crédit",
};

function periodLabel(from: string | null, to: string | null) {
  if (from && to) return `Du ${formatDate(new Date(from))} au ${formatDate(new Date(to))}`;
  if (from) return `Depuis le ${formatDate(new Date(from))}`;
  if (to) return `Jusqu'au ${formatDate(new Date(to))}`;
  return "Tout l'historique";
}

/**
 * Relevé de compte client A4 (flag « documents_client_pdf ») : même
 * présentation que le bon de commande (PurchaseOrderDocument), en noir et
 * blanc pour rester lisible sur une imprimante bas de gamme ou une photocopie.
 */
export function CustomerStatementDocument({ data, zindoMention }: { data: StatementData; zindoMention: boolean }) {
  const { business, custom, customer } = data;
  const money = (v: number) => formatMoney(v, business.currency);
  const currencyWords = business.currency === "XOF" ? "francs CFA" : business.currency;
  const th = "border border-zinc-900 px-2 py-1.5";
  const td = "border border-zinc-300 px-2 py-1.5";

  return (
    <FitToWidth>
      <div className="w-[210mm] bg-white p-8 text-zinc-900 shadow-sm print:w-full print:p-0 print:shadow-none">
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
            <p className="text-xl font-extrabold tracking-wide">RELEVÉ DE COMPTE</p>
            <p>Édité le {formatLongDate(new Date(data.printedAt))}</p>
            <p className="font-semibold">{periodLabel(data.from, data.to)}</p>
            {data.unpaidOnly && <p>Achats non soldés seulement</p>}
          </div>
        </div>

        {/* Client */}
        <div className="mt-4 rounded-lg border border-zinc-300 p-3 text-xs">
          <p className="mb-1 font-semibold uppercase text-zinc-500">Client</p>
          <p className="text-sm font-bold">{customer.name}</p>
          {customer.phone && <p>Tél : {customer.phone}</p>}
          {customer.address && <p>{customer.address}</p>}
        </div>

        {/* Chiffres clés */}
        <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
          <div className="rounded-lg border border-zinc-300 p-3">
            <p className="text-zinc-500">Total des achats</p>
            <p className="mt-1 text-base font-bold">{money(data.totalBought)}</p>
          </div>
          <div className="rounded-lg border border-zinc-300 p-3">
            <p className="text-zinc-500">Déjà payé</p>
            <p className="mt-1 text-base font-bold">{money(data.totalPaid)}</p>
          </div>
          <div className="rounded-lg border-2 border-zinc-900 p-3">
            <p className="font-semibold">RESTE DÛ À CE JOUR</p>
            <p className="mt-1 text-lg font-extrabold">{money(data.currentDebt)}</p>
          </div>
        </div>

        {/* Achats */}
        <p className="mt-6 text-sm font-bold uppercase">Achats</p>
        {data.sales.length === 0 ? (
          <p className="mt-2 text-xs text-zinc-500">Aucun achat sur cette période.</p>
        ) : (
          <table className="mt-2 w-full border-collapse text-xs">
            <thead>
              <tr className="bg-zinc-100" style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>
                <th className={`${th} text-left`}>Date</th>
                <th className={`${th} text-left`}>N° de vente</th>
                <th className={`${th} text-left`}>Statut</th>
                <th className={`${th} text-right`}>Montant</th>
                <th className={`${th} text-right`}>Payé</th>
                <th className={`${th} text-right`}>Reste</th>
              </tr>
            </thead>
            <tbody>
              {data.sales.map((s) => (
                <tr key={s.id} className="break-inside-avoid">
                  <td className={td}>{formatDate(new Date(s.createdAt))}</td>
                  <td className={`${td} font-mono`}>{s.number}</td>
                  <td className={td}>{s.total < 0 ? "Retour" : (STATUS_LABELS[s.status] ?? s.status)}</td>
                  <td className={`${td} text-right tabular-nums`}>{money(s.total)}</td>
                  <td className={`${td} text-right tabular-nums`}>{money(Math.min(s.total, s.amountPaid))}</td>
                  <td className={`${td} text-right tabular-nums ${s.remaining > 0 ? "font-bold" : ""}`}>
                    {s.remaining > 0 ? money(s.remaining) : "—"}
                  </td>
                </tr>
              ))}
              <tr className="font-bold">
                <td className={td} colSpan={3}>
                  Total
                </td>
                <td className={`${td} text-right tabular-nums`}>{money(data.totalBought)}</td>
                <td className={`${td} text-right tabular-nums`}>{money(data.totalPaid)}</td>
                <td className={`${td} text-right tabular-nums`}>{money(data.totalRemainingInPeriod)}</td>
              </tr>
            </tbody>
          </table>
        )}

        {/* Remboursements */}
        {data.payments.length > 0 && (
          <>
            <p className="mt-6 text-sm font-bold uppercase">Remboursements reçus</p>
            <table className="mt-2 w-full border-collapse text-xs">
              <thead>
                <tr className="bg-zinc-100" style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>
                  <th className={`${th} text-left`}>Date</th>
                  <th className={`${th} text-left`}>Moyen de paiement</th>
                  <th className={`${th} text-left`}>Note</th>
                  <th className={`${th} text-right`}>Montant</th>
                </tr>
              </thead>
              <tbody>
                {data.payments.map((p) => (
                  <tr key={p.id} className="break-inside-avoid">
                    <td className={td}>{formatDate(new Date(p.createdAt))}</td>
                    <td className={td}>{PAYMENT_METHOD_LABELS[p.method] ?? p.method}</td>
                    <td className={td}>{p.note ?? ""}</td>
                    <td className={`${td} text-right tabular-nums`}>{money(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {/* Solde */}
        <div className="mt-6 break-inside-avoid border-t-2 border-zinc-900 pt-3 text-xs">
          {data.currentDebt > 0 ? (
            <>
              <p className="text-sm">
                Reste dû à ce jour : <span className="font-extrabold">{money(data.currentDebt)}</span>
              </p>
              <p className="mt-1 italic">
                Arrêté à la somme de : {numberToFrenchWords(Math.round(data.currentDebt))} {currencyWords}.
              </p>
              {custom.mobileMoneyInfo && <p className="mt-2">Paiement par Mobile Money : {custom.mobileMoneyInfo}</p>}
            </>
          ) : (
            <p className="text-sm font-bold">Compte soldé : aucune somme due à ce jour.</p>
          )}
        </div>

        {/* Signature */}
        <div className="mt-8 grid grid-cols-2 gap-8 text-xs break-inside-avoid">
          <div />
          <div>
            <p className="font-semibold">Cachet et signature</p>
            <p className="text-zinc-500">{custom.invoiceSignerName || business.name}</p>
            <div className="mt-10 border-t border-zinc-400" />
          </div>
        </div>

        <p className="mt-6 text-center text-[10px] text-zinc-500">
          Relevé édité le {formatDateTime(new Date(data.printedAt))} par {data.printedBy}
          {zindoMention && " · Géré avec ZINDO · zindo.site"}
        </p>
      </div>
    </FitToWidth>
  );
}
