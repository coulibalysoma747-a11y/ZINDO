import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requirePermission, hasPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { isClientDocumentsEnabled, loadCustomerStatement } from "@/lib/client-documents";
import { isZindoMentionEnabled } from "@/lib/zindo-mention";
import { CustomerStatementDocument } from "@/components/clients/CustomerStatementDocument";
import { PrintDocumentButton } from "@/components/purchase-orders/PrintDocumentButton";

const DAY = /^\d{4}-\d{2}-\d{2}$/;

function isoDay(d: Date) {
  return d.toISOString().slice(0, 10);
}

/** Relevé de compte client A4 (flag « documents_client_pdf »). */
export default async function CustomerStatementPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ du?: string; au?: string; impayes?: string }>;
}) {
  const user = await requirePermission(PERMISSIONS.CUSTOMERS_VIEW);
  // Le relevé détaille les ventes : réservé à ceux qui voient déjà l'historique
  // des achats sur la fiche client (même règle que cette fiche).
  const [enabled, canSeeSales] = await Promise.all([
    isClientDocumentsEnabled(user.businessId),
    hasPermission(user.businessId, user.role, PERMISSIONS.SALES_CREATE, user.id),
  ]);
  if (!enabled || !canSeeSales) notFound();

  const { id } = await params;
  const sp = await searchParams;
  const from = sp.du && DAY.test(sp.du) ? sp.du : null;
  const to = sp.au && DAY.test(sp.au) ? sp.au : null;
  const unpaidOnly = sp.impayes === "1";

  const [data, zindoMention] = await Promise.all([
    loadCustomerStatement(id, user.businessId, {
      from,
      to,
      unpaidOnly,
      printedBy: `${user.firstName} ${user.lastName}`.trim(),
    }),
    isZindoMentionEnabled(user.businessId),
  ]);
  if (!data) notFound();

  const now = new Date();
  const monthStart = isoDay(new Date(now.getFullYear(), now.getMonth(), 1));
  const threeMonths = isoDay(new Date(now.getFullYear(), now.getMonth() - 2, 1));
  const base = `/clients/${id}/releve`;
  const presets = [
    { label: "Tout l'historique", href: base, active: !from && !to && !unpaidOnly },
    { label: "Impayés seulement", href: `${base}?impayes=1`, active: !from && !to && unpaidOnly },
    { label: "Ce mois", href: `${base}?du=${monthStart}`, active: from === monthStart && !to && !unpaidOnly },
    { label: "3 derniers mois", href: `${base}?du=${threeMonths}`, active: from === threeMonths && !to && !unpaidOnly },
  ];

  return (
    <div>
      <div className="mb-4 space-y-3 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link href={`/clients/${id}`} className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700">
            <ArrowLeft className="h-4 w-4" /> Retour à la fiche client
          </Link>
          <PrintDocumentButton />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {presets.map((p) => (
            <Link
              key={p.label}
              href={p.href}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                p.active
                  ? "border-emerald-600 bg-emerald-600 text-white"
                  : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              }`}
            >
              {p.label}
            </Link>
          ))}
          <form action={base} className="flex flex-wrap items-center gap-2 text-xs text-zinc-600 dark:text-slate-300">
            <label className="flex items-center gap-1">
              Du
              <input
                type="date"
                name="du"
                defaultValue={from ?? ""}
                className="rounded-lg border border-zinc-200 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
              />
            </label>
            <label className="flex items-center gap-1">
              au
              <input
                type="date"
                name="au"
                defaultValue={to ?? ""}
                className="rounded-lg border border-zinc-200 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
              />
            </label>
            <button
              type="submit"
              className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 font-medium hover:bg-zinc-50 dark:border-slate-700 dark:bg-slate-900"
            >
              Afficher
            </button>
          </form>
        </div>
      </div>
      <CustomerStatementDocument data={data} zindoMention={zindoMention} />
    </div>
  );
}
