import { formatMoney, formatLongDate, formatTime, numberToFrenchWords } from "@/lib/format";

export type FactureEnginData = {
  businessName: string;
  businessActivity?: string | null;
  businessPhone?: string | null;
  businessAddress?: string | null;
  businessCity?: string | null;
  logoUrl?: string | null;
  invoiceNumber: string;
  date: Date | string;
  signerName?: string | null;
  customerName?: string | null;
  customerCivility?: string | null;
  customerProfession?: string | null;
  customerIdType?: string | null;
  customerIdNumber?: string | null;
  customerAddress?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  engineType?: string | null;
  brand?: string | null;
  modelLabel?: string | null;
  designation?: string | null;
  chassisNumber?: string | null;
  engineNumber?: string | null;
  color?: string | null;
  condition?: string | null;
  quantity: number;
  total: number;
  /** Non imprimé (le règlement reste volontairement hors du document) — utile aux écrans internes (ex. échéancier de crédit). */
  remaining?: number;
  accessoryHelmet: boolean;
  accessoryToolKit: boolean;
  accessoryManual: boolean;
  accessoryKeys: boolean;
  accessorySafetyVest: boolean;
  accessoryOther?: string | null;
  warranty: boolean;
  warrantyDuration?: string | null;
  warrantyMileageLimit?: string | null;
  warrantyCoveredItems?: string | null;
  warrantyConditions?: string | null;
  locationName?: string | null;
  cashierName?: string | null;
  qrCodeDataUrl?: string | null;
  footerMessage?: string | null;
  currency?: string;
};

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-dashed border-zinc-200 py-1.5 text-xs last:border-0">
      <span className="text-zinc-500">{label}</span>
      <span className="text-right font-medium text-zinc-900">{value ?? "—"}</span>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200">
      <div className="border-l-4 border-red-700 bg-zinc-50 px-3 py-2 text-xs font-bold uppercase tracking-wide text-zinc-700">{title}</div>
      <div className="px-3 py-2">{children}</div>
    </div>
  );
}

function AccessoryLine({ label, checked }: { label: string; checked: boolean }) {
  return (
    <div className="flex items-center gap-2 py-1 text-xs text-zinc-700">
      <span
        className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border ${
          checked ? "border-red-700 bg-red-700 text-white" : "border-zinc-300"
        }`}
      >
        {checked && "✓"}
      </span>
      {label}
    </div>
  );
}

/**
 * Facture de vente d'engin — document distinct de la Facture A4 générique
 * (components/sales/Facture.tsx) : grille de cartes façon "fiche
 * d'identité" du véhicule vendu, calquée sur un modèle réel fourni par
 * l'utilisateur. Le détail du règlement (payé/reste) est volontairement
 * absent de ce document imprimé — seul le QR code donne la situation à
 * jour, pour ne jamais figer sur papier une information qui peut changer
 * (versement ultérieur d'un crédit). Autonome (CSS d'impression embarqué).
 */
export function FactureEngin({ data }: { data: FactureEnginData }) {
  const currency = data.currency ?? "XOF";
  const money = (v: number) => formatMoney(v, currency);
  const amountInWords = numberToFrenchWords(data.total);
  const currencyWord = currency === "XOF" ? "Francs CFA" : currency;
  const accessories = [
    { label: "Casque de protection", checked: data.accessoryHelmet },
    { label: "Kit d'outils", checked: data.accessoryToolKit },
    { label: "Manuel d'utilisation", checked: data.accessoryManual },
    { label: "Clés de contact", checked: data.accessoryKeys },
    { label: "Gilet de sécurité", checked: data.accessorySafetyVest },
  ];

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4; margin: 12mm; }
          html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
          #zindo-facture-engin { width: 100%; margin: 0; box-shadow: none; border: none; }
        }
      `}</style>

      <div id="zindo-facture-engin" className="mx-auto w-full max-w-[210mm] overflow-hidden rounded-2xl border border-zinc-200 bg-white text-zinc-800 shadow-sm">
        {/* En-tête */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 p-6">
          <div className="flex items-center gap-4">
            {data.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.logoUrl} alt={data.businessName} className="h-14 w-14 shrink-0 object-contain" />
            ) : (
              <div className="h-14 w-3.5 shrink-0 skew-x-[-12deg] bg-red-700" />
            )}
            <div>
              <p className="text-xl font-extrabold uppercase tracking-wide text-zindo-ink-900 sm:text-2xl">{data.businessName}</p>
              {data.businessActivity && <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{data.businessActivity}</p>}
              {(data.businessAddress || data.businessCity) && (
                <p className="mt-2 text-xs text-zinc-500">{[data.businessCity, data.businessAddress].filter(Boolean).join(" - ")}</p>
              )}
              {data.businessPhone && <p className="text-xs text-zinc-500">Tél. {data.businessPhone}</p>}
            </div>
          </div>

          <span className="rounded-md bg-red-700 px-6 py-2.5 text-lg font-extrabold uppercase tracking-wide text-white">Facture</span>

          <div className="rounded-lg border border-zinc-200 px-3 py-2 text-xs">
            <Row label="N° FACTURE" value={data.invoiceNumber} />
            <Row label="DATE" value={formatLongDate(data.date)} />
            <Row label="HEURE" value={formatTime(data.date)} />
          </div>
        </div>

        <p className="px-6 pt-4 text-sm text-zinc-700">
          Je soussigné <span className="font-bold text-zinc-900">{data.signerName ?? data.businessName}</span> reconnais avoir vendu
          l&apos;engin décrit ci-dessous :
        </p>

        {/* Client + engin */}
        <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
          <SectionCard title="Informations du client">
            <Row label="Nom / Structure" value={data.customerName} />
            <Row label="Civilité" value={data.customerCivility} />
            <Row label="Profession / Fonction" value={data.customerProfession} />
            <Row label="Type de pièce" value={data.customerIdType} />
            <Row label="N° de pièce" value={data.customerIdNumber} />
            <Row label="Adresse" value={data.customerAddress} />
            <Row label="Téléphone" value={data.customerPhone} />
            <Row label="E-mail" value={data.customerEmail} />
          </SectionCard>

          <SectionCard title="Informations de l'engin">
            <Row label="Type d'engin" value={data.engineType} />
            <Row label="Marque" value={data.brand} />
            <Row label="Modèle" value={data.modelLabel} />
            <Row label="Désignation" value={data.designation} />
            <Row label="N° châssis" value={data.chassisNumber} />
            <Row label="N° moteur" value={data.engineNumber} />
            <Row label="Couleur" value={data.color} />
            <Row label="État" value={data.condition} />
            <Row label="Quantité" value={data.quantity} />
          </SectionCard>

          <SectionCard title="Montant">
            <Row label="Montant en lettres" value={`${amountInWords} ${currencyWord}`} />
            <Row label="Montant en chiffres" value={money(data.total)} />
            <div className="mt-2 rounded-md bg-red-700 px-3 py-2 text-center text-sm font-extrabold uppercase tracking-wide text-white">
              Total à payer {money(data.total)}
            </div>
          </SectionCard>

          <SectionCard title="Règlement">
            <p className="text-xs leading-relaxed text-zinc-500">
              Le détail du règlement (montant versé, reste à payer) n&apos;est pas imprimé sur cette facture. Scannez le QR code
              ci-dessous pour le consulter : il donne la situation à jour de ce dossier.
            </p>
          </SectionCard>

          <SectionCard title="Accessoires remis avec la moto">
            {accessories.map((a) => (
              <AccessoryLine key={a.label} label={a.label} checked={a.checked} />
            ))}
            {data.accessoryOther && <p className="mt-1 text-xs text-zinc-600">Autre : {data.accessoryOther}</p>}
          </SectionCard>

          <SectionCard title="Garantie éventuelle">
            <Row label="Garantie" value={data.warranty ? "Oui" : "Non"} />
            <Row label="Durée" value={data.warrantyDuration} />
            <Row label="Kilométrage limite" value={data.warrantyMileageLimit} />
            <Row label="Éléments couverts" value={data.warrantyCoveredItems} />
            <Row label="Conditions" value={data.warrantyConditions} />
          </SectionCard>
        </div>

        {/* Transaction / QR / signature */}
        <div className="grid grid-cols-1 gap-4 px-6 pb-6 sm:grid-cols-3">
          <SectionCard title="Transaction">
            <Row label="Date / Heure" value={`${formatLongDate(data.date)} · ${formatTime(data.date)}`} />
            <Row label="Lieu" value={[data.businessCity, data.businessAddress].filter(Boolean).join(" - ") || data.locationName} />
            <Row label="Agent vendeur" value={data.cashierName} />
          </SectionCard>

          <SectionCard title="QR — Vérification et règlement">
            <div className="flex items-center justify-center py-2">
              {data.qrCodeDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={data.qrCodeDataUrl} alt="QR code de vérification" width={92} height={92} />
              ) : (
                <p className="text-xs text-zinc-400">QR indisponible</p>
              )}
            </div>
          </SectionCard>

          <SectionCard title="Signature et cachet du vendeur">
            <div className="h-16" />
          </SectionCard>
        </div>

        <div className="bg-red-700 py-3 text-center text-sm font-bold uppercase tracking-[0.2em] text-white">
          {data.footerMessage ?? "Merci pour la confiance"}
        </div>
      </div>
    </>
  );
}
