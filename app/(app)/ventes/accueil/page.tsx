import Link from "next/link";
import { redirect } from "next/navigation";
import { Store, FileText, Table2, ChevronRight } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getVisibleNavItems } from "@/lib/nav-server";
import { getCurrentLocation } from "@/lib/location";
import { isSalesHubEnabled } from "@/lib/sales-hub";
import { isFactureTableEnabled } from "@/lib/facture-table";
import { SalesHistoryPanel, SALES_HISTORY_PERIODS } from "@/components/sales/SalesHistoryPanel";

/**
 * Écran de départ des ventes (flag accueil_vente) — voir lib/sales-hub.ts.
 * Comme chez FasoStock : Caisse rapide et Facture A4 côte à côte, puis
 * l'historique des ventes directement en dessous (sans clic de plus).
 */
export default async function SalesHubPage({ searchParams }: { searchParams: Promise<{ periode?: string; q?: string }> }) {
  const user = await requireUser();
  const currentLocation = await getCurrentLocation(user.businessId);
  const [enabled, navItems, { periode, q }, factureTable] = await Promise.all([
    isSalesHubEnabled(user.businessId),
    getVisibleNavItems(user.businessId, user.role, user.id, user.business.activityKey, currentLocation?.id),
    searchParams,
    isFactureTableEnabled(user.businessId),
  ]);
  if (!enabled) redirect("/ventes");

  const visible = new Set(navItems.map((i) => i.href));
  if (!visible.has("/ventes")) redirect("/dashboard");

  const tiles = [
    { href: "/ventes", label: "Caisse rapide", hint: "Encaisser au comptoir, ticket", icon: Store },
    { href: "/factures", label: "Facture A4", hint: "Facture détaillée pour un client", icon: FileText },
    ...(factureTable
      ? [{ href: "/factures/tableau", label: "Facture A4 (tableau)", hint: "Saisie ligne par ligne au clavier", icon: Table2 }]
      : []),
  ].filter((t) => visible.has(t.href === "/factures/tableau" ? "/factures" : t.href));

  const period = SALES_HISTORY_PERIODS.some((p) => p.value === periode) ? (periode as string) : "aujourdhui";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-zinc-900">Vente</h1>
        <p className="text-sm text-zinc-500">{currentLocation?.name ?? user.business.name}</p>
      </div>

      <div className={`grid grid-cols-2 gap-3 ${tiles.length > 2 ? "lg:max-w-4xl lg:grid-cols-3" : "lg:max-w-2xl"}`}>
        {tiles.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="flex flex-col gap-3 rounded-2xl border-2 border-zindo-green-200 bg-white p-4 active:bg-zinc-50 dark:border-zindo-green-500/30 dark:bg-slate-900"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-zindo-green-50 text-zindo-green-700 dark:bg-zindo-green-500/15 dark:text-zindo-green-300">
              <t.icon className="h-6 w-6" />
            </span>
            <span>
              <span className="flex items-center justify-between font-semibold text-zinc-900 dark:text-slate-100">
                {t.label} <ChevronRight className="h-4 w-4 text-zinc-400" />
              </span>
              <span className="text-xs text-zinc-500">{t.hint}</span>
            </span>
          </Link>
        ))}
      </div>

      <SalesHistoryPanel user={user} periode={period} query={q ?? ""} />
    </div>
  );
}
