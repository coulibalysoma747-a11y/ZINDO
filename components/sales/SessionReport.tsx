import { formatMoney, formatDateTime } from "@/lib/format";

export type SessionReportData = {
  businessName: string;
  locationName: string;
  sessionNumber: string;
  cashierName: string;
  openedAt: Date | string;
  closedAt: Date | string;
  salesCount: number;
  totalRevenue: number;
  cashCollected: number;
  mobileCollected: number;
  cardCollected: number;
  otherCollected: number;
  creditCollected: number;
  grossMargin: number;
  expensesTotal: number;
  netMargin: number;
  marginRate: number;
  openingAmount: number;
  expectedCash: number;
  countedCash: number;
  variance: number;
  note?: string | null;
  currency?: string;
};

function DashLine() {
  return <div className="session-dashes">{"-".repeat(44)}</div>;
}

function Row({ label, value, bold, tone }: { label: string; value: string; bold?: boolean; tone?: "red" | "emerald" }) {
  return (
    <div
      className={`flex justify-between ${bold ? "font-bold" : ""} ${
        tone === "red" ? "text-red-600" : tone === "emerald" ? "text-emerald-600" : ""
      }`}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

/**
 * Ticket de clôture de session de caisse — même approche autonome que Receipt.tsx
 * (CSS d'impression embarqué, masquage du reste de l'écran) pour fonctionner
 * indépendamment de la page qui l'affiche.
 */
export function SessionReport({ data }: { data: SessionReportData }) {
  const currency = data.currency ?? "XOF";
  const money = (v: number) => formatMoney(v, currency);
  const varianceTone = data.variance === 0 ? undefined : data.variance > 0 ? "emerald" : "red";

  return (
    <>
      <style>{`
        #zindo-session-report {
          font-family: "Courier New", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        }
        .session-dashes {
          white-space: nowrap;
          overflow: hidden;
          letter-spacing: 0.02em;
        }
        @media print {
          @page { size: 80mm auto; margin: 0; }
          html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
          body * { visibility: hidden; }
          #zindo-session-report, #zindo-session-report * { visibility: visible; }
          #zindo-session-report {
            position: absolute;
            top: 0;
            left: 0;
            width: 80mm;
            max-width: none;
            margin: 0;
            padding: 3mm 2.5mm;
            box-shadow: none;
            border: none;
          }
        }
      `}</style>

      <div
        id="zindo-session-report"
        className="mx-auto w-full max-w-[80mm] rounded-xl border border-zinc-200 bg-white p-4 text-[13px] leading-snug text-zinc-800 shadow-sm"
      >
        <div className="text-center">
          <p className="text-sm font-bold uppercase">{data.businessName}</p>
          <p>{data.locationName}</p>
          <p className="font-semibold">Rapport de clôture de caisse</p>
        </div>

        <DashLine />

        <Row label="Session N°" value={data.sessionNumber} />
        <Row label="Caissier" value={data.cashierName} />
        <Row label="Ouverture" value={formatDateTime(data.openedAt)} />
        <Row label="Clôture" value={formatDateTime(data.closedAt)} />

        <DashLine />

        <p className="font-semibold">Activité</p>
        <Row label="Nombre de ventes" value={String(data.salesCount)} />
        <Row label="Chiffre d'affaires" value={money(data.totalRevenue)} />

        <DashLine />

        <p className="font-semibold">Encaissement par moyen de paiement</p>
        <Row label="Espèces" value={money(data.cashCollected)} />
        <Row label="Mobile Money" value={money(data.mobileCollected)} />
        {data.cardCollected > 0 && <Row label="Carte bancaire" value={money(data.cardCollected)} />}
        {data.creditCollected > 0 && <Row label="Crédit (reçu)" value={money(data.creditCollected)} />}
        {data.otherCollected > 0 && <Row label="Autre" value={money(data.otherCollected)} />}

        <DashLine />

        <p className="font-semibold">Marge et dépenses</p>
        <Row label="Marge brute" value={money(data.grossMargin)} />
        <Row label="Dépenses" value={`-${money(data.expensesTotal)}`} />
        <Row label="Marge nette" value={money(data.netMargin)} bold />
        <Row label="Taux de marge net" value={`${data.marginRate.toFixed(1)} %`} />

        <DashLine />

        <p className="font-semibold">Caisse (espèces)</p>
        <Row label="Fond d'ouverture" value={money(data.openingAmount)} />
        <Row label="Caisse attendue" value={money(data.expectedCash)} />
        <Row label="Montant compté" value={money(data.countedCash)} />
        <Row
          label="Écart"
          value={`${data.variance > 0 ? "+" : ""}${money(data.variance)}`}
          bold
          tone={varianceTone}
        />

        {data.note && (
          <>
            <DashLine />
            <p className="font-semibold">Note sur l&apos;écart</p>
            <p className="whitespace-pre-wrap">{data.note}</p>
          </>
        )}

        <DashLine />
        <p className="text-center">ZINDO — Gestion de caisse</p>
      </div>
    </>
  );
}
