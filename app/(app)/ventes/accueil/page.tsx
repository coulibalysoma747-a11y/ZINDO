import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Store, FileText, FileSignature, History, Wallet, ChevronRight } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getVisibleNavItems } from "@/lib/nav-server";
import { getCurrentLocation } from "@/lib/location";
import { isSalesHubEnabled } from "@/lib/sales-hub";
import { supabase } from "@/lib/supabase";
import { formatMoney, startOfToday } from "@/lib/format";

/** Écran de départ des ventes (flag accueil_vente) — voir lib/sales-hub.ts. */
export default async function SalesHubPage() {
  const user = await requireUser();
  const currentLocation = await getCurrentLocation(user.businessId);
  const [enabled, navItems] = await Promise.all([
    isSalesHubEnabled(user.businessId),
    getVisibleNavItems(user.businessId, user.role, user.id, user.business.activityKey, currentLocation?.id),
  ]);
  if (!enabled) redirect("/ventes");

  const visible = new Set(navItems.map((i) => i.href));
  if (!visible.has("/ventes")) redirect("/dashboard");

  let todayCount = 0;
  let todayTotal = 0;
  if (visible.has("/ventes/historique") && currentLocation) {
    const { data } = await supabase
      .from("sales")
      .select("total")
      .eq("business_id", user.businessId)
      .eq("location_id", currentLocation.id)
      .neq("status", "ANNULEE")
      .gte("created_at", startOfToday().toISOString());
    todayCount = data?.length ?? 0;
    todayTotal = (data ?? []).reduce((s, r) => s + ((r.total as number) ?? 0), 0);
  }

  const tiles = [
    { href: "/ventes", label: "Caisse rapide", hint: "Encaisser au comptoir", icon: Store },
    { href: "/factures", label: "Facture A4", hint: "Facture détaillée pour un client", icon: FileText },
    { href: "/devis", label: "Devis", hint: "Proposition de prix", icon: FileSignature },
    {
      href: "/ventes/historique",
      label: "Historique des ventes",
      hint: `${todayCount} vente${todayCount > 1 ? "s" : ""} aujourd'hui`,
      icon: History,
    },
    { href: "/ventes/sessions", label: "Sessions de caisse", hint: "Ouverture, fermeture, écarts", icon: Wallet },
  ].filter((t) => visible.has(t.href));

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-zinc-900">Vente</h1>
        <p className="text-sm text-zinc-500">{currentLocation?.name ?? user.business.name}</p>
      </div>

      <Link
        href="/ventes"
        className="flex items-center justify-center gap-2 rounded-2xl bg-zindo-green-600 px-5 py-4 text-lg font-bold text-white shadow-md shadow-zindo-green-900/20 active:bg-zindo-green-700"
      >
        <Plus className="h-6 w-6" /> Nouvelle vente
      </Link>

      {visible.has("/ventes/historique") && (
        <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Aujourd&apos;hui</p>
          <p className="mt-0.5 text-2xl font-bold text-zinc-900 dark:text-slate-100">{formatMoney(todayTotal, user.business.currency)}</p>
          <p className="text-sm text-zinc-500">
            {todayCount} vente{todayCount > 1 ? "s" : ""}
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {tiles.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 active:bg-zinc-50 dark:border-slate-700 dark:bg-slate-900"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-zindo-green-50 text-zindo-green-700 dark:bg-zindo-green-500/15 dark:text-zindo-green-300">
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
    </div>
  );
}
