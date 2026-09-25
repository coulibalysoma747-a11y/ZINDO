/* eslint-disable @next/next/no-img-element -- document imprimé : <img> garantit le rendu à l'impression/PDF. */

/**
 * Bandeau publicitaire "Créé avec ZINDO" en bas des documents envoyés aux
 * fournisseurs (demande de prix, bon de commande) : chaque document devient
 * une publicité, et le QR code porte le code de parrainage du commerce.
 */
export function PoweredByZindo({
  qrDataUrl,
  site,
  whatsapp,
  label = "Document créé avec ZINDO",
}: {
  qrDataUrl: string | null;
  site: string;
  whatsapp: string;
  label?: string;
}) {
  return (
    <div
      className="mt-8 flex items-center gap-4 rounded-xl border border-emerald-200 bg-emerald-50/70 px-5 py-3 print:break-inside-avoid"
      style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}
    >
      <img src="/brand/zindo-emblem.png" alt="ZINDO" className="h-11 w-11 shrink-0 rounded-lg" />
      <div className="min-w-0 flex-1 text-[11px] leading-snug text-zinc-700">
        <p className="text-sm font-bold text-emerald-800">{label}</p>
        <p>Gérez votre stock, vos ventes et vos commandes depuis votre téléphone — même sans Internet.</p>
        <p className="mt-0.5 font-medium text-zinc-900">
          🌐 {site} · 📱 WhatsApp : {whatsapp}
        </p>
        <p className="font-semibold text-emerald-700">Scannez le code et essayez gratuitement →</p>
      </div>
      {qrDataUrl && <img src={qrDataUrl} alt={`QR code ${site}`} className="h-20 w-20 shrink-0" />}
    </div>
  );
}

/** Version une ligne pour les tickets 58/80 mm. */
export function PoweredByZindoLine({ site }: { site: string }) {
  return <p className="mt-2 text-center text-[10px] text-zinc-500">— Créé avec ZINDO · {site} —</p>;
}
