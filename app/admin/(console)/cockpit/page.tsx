import Link from "next/link";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Crown,
  Hourglass,
  LifeBuoy,
  MapPin,
  ReceiptText,
  ShoppingBag,
  Sparkles,
  Store,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { requireFounder } from "@/lib/superadmin-auth";
import { formatDate, formatMoney } from "@/lib/format";

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKS = 12;
const MONTHS = 6;
const TRIAL_ENDING_DAYS = 3;
const PAGE_SIZE = 1000;
// Garde-fou : au-delà de 50 000 ventes sur 12 semaines, passer par une fonction SQL d'agrégation.
const MAX_PAGES = 50;

type BusinessRow = { id: string; name: string; city: string | null; activity: string | null; createdAt: string };
type SubscriptionRow = {
  businessId: string;
  status: string;
  billingCycle: "MONTHLY" | "ANNUAL";
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  plan: { monthlyPrice: number; annualPrice: number } | null;
};
type InvoiceRow = { businessId: string; amount: number; status: string; paidAt: string | null };
type SaleRow = { businessId: string; total: number; createdAt: string };
type MarketOrderRow = { total: number; status: string };

/** Rapatrie toutes les lignes d'une requête, page par page (l'API plafonne à 1 000 lignes). */
async function fetchAll<T>(page: (from: number, to: number) => PromiseLike<{ data: unknown }>): Promise<T[]> {
  const rows: T[] = [];
  for (let i = 0; i < MAX_PAGES; i++) {
    const { data } = await page(i * PAGE_SIZE, (i + 1) * PAGE_SIZE - 1);
    const chunk = (data ?? []) as T[];
    rows.push(...chunk);
    if (chunk.length < PAGE_SIZE) break;
  }
  return rows;
}

function monthStart(offset: number) {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  d.setMonth(d.getMonth() + offset);
  return d;
}

function weekStart(offset: number) {
  const d = new Date();
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1) - day + offset * 7);
  d.setHours(0, 0, 0, 0);
  return d;
}

function variation(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 100);
}

function greeting() {
  const hour = Number(new Intl.DateTimeFormat("fr-FR", { hour: "numeric", timeZone: "Africa/Ouagadougou" }).format(new Date()));
  return hour < 5 || hour >= 18 ? "Bonsoir" : "Bonjour";
}

// Page rendue côté serveur à chaque visite : l'heure de la requête suffit.
function currentTime() {
  return Date.now();
}

function titleCase(text: string) {
  // Ne touche qu'aux saisies tout en majuscules ou tout en minuscules.
  if (text !== text.toUpperCase() && text !== text.toLowerCase()) return text;
  return text
    .toLocaleLowerCase("fr-FR")
    .replace(/(^|[\s'-])(\p{L})/gu, (_, sep: string, c: string) => sep + c.toLocaleUpperCase("fr-FR"));
}

function compact(n: number) {
  return new Intl.NumberFormat("fr-FR", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

export default async function FounderCockpitPage() {
  const admin = await requireFounder();
  const now = currentTime();
  const thisMonth = monthStart(0);
  const prevMonth = monthStart(-1);
  const firstWeek = weekStart(-(WEEKS - 1));
  const since7 = now - 7 * DAY_MS;
  const since30 = now - 30 * DAY_MS;
  // Couvre à la fois les 12 semaines du graphique et le mois précédent complet.
  const salesSince = new Date(Math.min(firstWeek.getTime(), prevMonth.getTime()));

  const [businesses, subscriptions, invoices, sales, marketOrders, openTickets, pendingVerifications] = await Promise.all([
    fetchAll<BusinessRow>((from, to) =>
      supabase
        .from("businesses")
        .select("id, name, city, activity, createdAt:created_at")
        .order("created_at", { ascending: true })
        .range(from, to)
    ),
    fetchAll<SubscriptionRow>((from, to) =>
      supabase
        .from("business_subscriptions")
        .select(
          "businessId:business_id, status, billingCycle:billing_cycle, trialEndsAt:trial_ends_at, currentPeriodEnd:current_period_end, plan:subscription_plans(monthlyPrice:monthly_price, annualPrice:annual_price)"
        )
        .order("id")
        .range(from, to)
    ),
    fetchAll<InvoiceRow>((from, to) =>
      supabase
        .from("subscription_invoices")
        .select("businessId:business_id, amount, status, paidAt:paid_at")
        .neq("status", "ANNULEE")
        .order("id")
        .range(from, to)
    ),
    fetchAll<SaleRow>((from, to) =>
      supabase
        .from("sales")
        .select("businessId:business_id, total, createdAt:created_at")
        .neq("status", "ANNULEE")
        .gte("created_at", salesSince.toISOString())
        .order("id")
        .range(from, to)
    ),
    fetchAll<MarketOrderRow>((from, to) =>
      supabase
        .from("market_orders")
        .select("total, status")
        .gte("created_at", thisMonth.toISOString())
        .order("id")
        .range(from, to)
    ),
    supabase.from("support_tickets").select("id", { count: "exact", head: true }).neq("status", "RESOLU"),
    supabase.from("market_verifications").select("business_id", { count: "exact", head: true }).eq("status", "EN_ATTENTE"),
  ]);

  const businessById = new Map(businesses.map((b) => [b.id, b]));

  // --- Revenus ---
  const paidInvoices = invoices.filter((i) => i.status === "PAYEE" && i.paidAt);
  const pendingInvoices = invoices.filter((i) => i.status === "EN_ATTENTE");
  const revenueByMonth = Array.from({ length: MONTHS }, (_, idx) => {
    const start = monthStart(idx - (MONTHS - 1));
    const end = monthStart(idx - (MONTHS - 1) + 1);
    const amount = paidInvoices
      .filter((i) => {
        const t = new Date(i.paidAt!).getTime();
        return t >= start.getTime() && t < end.getTime();
      })
      .reduce((s, i) => s + i.amount, 0);
    return { label: new Intl.DateTimeFormat("fr-FR", { month: "short" }).format(start).replace(".", ""), start, amount };
  });
  const revenueThisMonth = revenueByMonth[MONTHS - 1].amount;
  const revenuePrevMonth = revenueByMonth[MONTHS - 2].amount;
  const revenueTotal6 = revenueByMonth.reduce((s, m) => s + m.amount, 0);

  // --- Abonnements (même règle d'échéance que la page Abonnements) ---
  const subs = subscriptions.map((s) => {
    let status = s.status;
    if (status === "TRIAL" && s.trialEndsAt && new Date(s.trialEndsAt).getTime() <= now) status = "EXPIRED";
    if (status === "ACTIVE" && s.currentPeriodEnd && new Date(s.currentPeriodEnd).getTime() <= now) status = "PAST_DUE";
    return { ...s, status };
  });
  const paying = subs.filter((s) => s.status === "ACTIVE");
  const mrr = paying.reduce(
    (sum, s) => sum + (s.plan ? (s.billingCycle === "ANNUAL" ? s.plan.annualPrice / 12 : s.plan.monthlyPrice) : 0),
    0
  );
  const inTrial = subs.filter((s) => s.status === "TRIAL");
  const trialsEnding = inTrial
    .filter((s) => s.trialEndsAt && new Date(s.trialEndsAt).getTime() - now <= TRIAL_ENDING_DAYS * DAY_MS)
    .sort((a, b) => new Date(a.trialEndsAt!).getTime() - new Date(b.trialEndsAt!).getTime());
  const everPaid = new Set(paidInvoices.map((i) => i.businessId));
  const conversionRate = businesses.length ? Math.round((everPaid.size / businesses.length) * 100) : 0;

  // --- Activité réelle des commerçants ---
  const active7 = new Set<string>();
  const active30 = new Set<string>();
  let volumeThisMonth = 0;
  let volumePrevMonth = 0;
  const volumeByBusiness = new Map<string, { total: number; count: number }>();
  const activeByWeek = Array.from({ length: WEEKS }, () => new Set<string>());
  for (const sale of sales) {
    const t = new Date(sale.createdAt).getTime();
    if (t >= since7) active7.add(sale.businessId);
    if (t >= since30) active30.add(sale.businessId);
    if (t >= thisMonth.getTime()) {
      volumeThisMonth += sale.total;
      const agg = volumeByBusiness.get(sale.businessId) ?? { total: 0, count: 0 };
      agg.total += sale.total;
      agg.count += 1;
      volumeByBusiness.set(sale.businessId, agg);
    } else if (t >= prevMonth.getTime()) {
      volumePrevMonth += sale.total;
    }
    const w = Math.floor((t - firstWeek.getTime()) / (7 * DAY_MS));
    if (w >= 0 && w < WEEKS) activeByWeek[w].add(sale.businessId);
  }
  const topBusinesses = [...volumeByBusiness.entries()]
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 5)
    .map(([id, agg]) => ({ id, name: businessById.get(id)?.name ?? "Commerce supprimé", ...agg }));

  // --- Inscriptions ---
  const signupsThisMonth = businesses.filter((b) => new Date(b.createdAt).getTime() >= thisMonth.getTime()).length;
  const signupsPrevMonth = businesses.filter((b) => {
    const t = new Date(b.createdAt).getTime();
    return t >= prevMonth.getTime() && t < thisMonth.getTime();
  }).length;
  const weekly = Array.from({ length: WEEKS }, (_, idx) => {
    const start = weekStart(idx - (WEEKS - 1));
    const end = start.getTime() + 7 * DAY_MS;
    return {
      label: new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(start).replace(".", ""),
      signups: businesses.filter((b) => {
        const t = new Date(b.createdAt).getTime();
        return t >= start.getTime() && t < end;
      }).length,
      active: activeByWeek[idx].size,
    };
  });

  // --- Répartitions ---
  const breakdown = (key: (b: BusinessRow) => string | null) => {
    // Regroupe « NIANGOLOKO » et « Niangoloko » : saisies libres à l'inscription.
    const counts = new Map<string, { label: string; count: number }>();
    for (const b of businesses) {
      const raw = key(b)?.trim().replace(/\s+/g, " ") || "Non renseigné";
      const k = raw.toLocaleLowerCase("fr-FR");
      const entry = counts.get(k) ?? { label: titleCase(raw), count: 0 };
      entry.count += 1;
      counts.set(k, entry);
    }
    return [...counts.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)
      .map((e): [string, number] => [e.label, e.count]);
  };
  const byActivity = breakdown((b) => b.activity);
  const byCity = breakdown((b) => b.city);

  // --- Marché ---
  const marketLive = marketOrders.filter((o) => o.status !== "ANNULEE");
  const marketVolume = marketLive.reduce((s, o) => s + o.total, 0);
  const marketDelivered = marketOrders.filter((o) => o.status === "LIVREE").length;

  const pendingAmount = pendingInvoices.reduce((s, i) => s + i.amount, 0);
  const actions = [
    {
      label: "Paiements à confirmer",
      value: pendingInvoices.length,
      hint: pendingInvoices.length ? formatMoney(pendingAmount) : "Rien en attente",
      href: "/admin/abonnements",
      icon: ReceiptText,
    },
    {
      label: "Essais qui finissent",
      value: trialsEnding.length,
      hint: `Dans les ${TRIAL_ENDING_DAYS} prochains jours`,
      href: "#essais",
      icon: Hourglass,
    },
    {
      label: "Demandes de support",
      value: openTickets.count ?? 0,
      hint: "Non résolues",
      href: "/admin/support",
      icon: LifeBuoy,
    },
    {
      label: "Vérifications Marché",
      value: pendingVerifications.count ?? 0,
      hint: "Pièces à examiner",
      href: "/admin/verifications",
      icon: BadgeCheck,
    },
  ];

  const funnel = [
    { label: "Commerces inscrits", value: businesses.length },
    { label: "Ont vendu (30 jours)", value: active30.size },
    { label: "Actifs cette semaine", value: active7.size },
    { label: "Abonnés payants", value: paying.length },
  ];
  const firstName = admin.name.split(" ")[0];
  const today = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date());

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* En-tête : les quatre chiffres qui comptent */}
      <section className="relative overflow-hidden rounded-3xl bg-slate-950 p-5 text-white shadow-xl sm:p-8">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-zindo-green-500/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-amber-400/10 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-amber-400">
              <Crown className="h-3.5 w-3.5" /> Cockpit du fondateur
            </p>
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
              {greeting()}, {firstName}
            </h1>
            <p className="mt-1 text-sm capitalize text-slate-400">{today}</p>
          </div>
          <Link
            href="/admin/abonnements"
            className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/15 transition hover:bg-white/15"
          >
            Abonnements & revenus <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="relative mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <HeroStat
            label="Encaissé ce mois"
            value={formatMoney(revenueThisMonth)}
            delta={variation(revenueThisMonth, revenuePrevMonth)}
            icon={Wallet}
          />
          <HeroStat
            label="Revenu mensuel récurrent"
            value={formatMoney(mrr)}
            sub={`${paying.length} abonné${paying.length > 1 ? "s" : ""} payant${paying.length > 1 ? "s" : ""}`}
            icon={TrendingUp}
          />
          <HeroStat
            label="Inscriptions du mois"
            value={String(signupsThisMonth)}
            delta={variation(signupsThisMonth, signupsPrevMonth)}
            icon={Sparkles}
          />
          <HeroStat
            label="Commerces actifs (7 jours)"
            value={String(active7.size)}
            sub={`sur ${businesses.length} inscrits`}
            icon={Store}
          />
        </div>
      </section>

      {/* À traiter aujourd'hui */}
      <section>
        <SectionTitle title="À traiter aujourd'hui" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {actions.map((a) => {
            const urgent = a.value > 0;
            return (
              <Link
                key={a.label}
                href={a.href}
                className={`group flex items-center gap-4 rounded-2xl border bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-lg ${
                  urgent ? "border-amber-200 shadow-sm" : "border-slate-200"
                }`}
              >
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                    urgent ? "bg-amber-50 text-amber-600" : "bg-slate-50 text-slate-400"
                  }`}
                >
                  <a.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-600">{a.label}</p>
                  <p className="truncate text-xs text-slate-400">{a.hint}</p>
                </div>
                <span className={`text-2xl font-extrabold tabular-nums ${urgent ? "text-slate-900" : "text-slate-300"}`}>
                  {a.value}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Graphiques */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel
          title="Revenus encaissés"
          subtitle={`${formatMoney(revenueTotal6)} sur ${MONTHS} mois`}
        >
          <BarChart
            data={revenueByMonth.map((m) => ({ label: m.label, value: m.amount, tooltip: formatMoney(m.amount) }))}
            format={compact}
          />
        </Panel>
        <Panel title="Commerces actifs par semaine" subtitle="Au moins une vente dans la semaine">
          <BarChart
            data={weekly.map((w) => ({
              label: w.label,
              value: w.active,
              tooltip: `${w.active} actif${w.active > 1 ? "s" : ""} · ${w.signups} inscription${w.signups > 1 ? "s" : ""}`,
            }))}
            format={(n) => String(n)}
          />
        </Panel>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Entonnoir */}
        <Panel title="Entonnoir" subtitle={`${conversionRate} % des commerces ont déjà payé`}>
          <div className="space-y-3">
            {funnel.map((step, idx) => {
              const base = funnel[0].value || 1;
              const pct = Math.round((step.value / base) * 100);
              return (
                <div key={step.label}>
                  <div className="mb-1 flex items-baseline justify-between text-sm">
                    <span className="text-slate-600">{step.label}</span>
                    <span className="font-bold tabular-nums text-slate-900">
                      {step.value}
                      {idx > 0 && <span className="ml-1.5 text-xs font-medium text-slate-400">{pct} %</span>}
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-zindo-green-500"
                      style={{ width: `${Math.max(pct, step.value > 0 ? 2 : 0)}%`, opacity: 1 - idx * 0.18 }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel title="Activités" subtitle="Les 6 plus représentées">
          <RankList rows={byActivity} total={businesses.length} />
        </Panel>
        <Panel title="Villes" subtitle="Où sont vos commerçants" icon={MapPin}>
          <RankList rows={byCity} total={businesses.length} />
        </Panel>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Volume traité par ZINDO */}
        <Panel title="Volume de ventes traité" subtitle="Toutes les caisses ZINDO, ce mois">
          <p className="text-3xl font-extrabold tracking-tight text-slate-900">{formatMoney(volumeThisMonth)}</p>
          <DeltaBadge delta={variation(volumeThisMonth, volumePrevMonth)} light />
          <div className="mt-5 border-t border-slate-100 pt-4">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <ShoppingBag className="h-3.5 w-3.5" /> Marché ce mois
            </p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <MiniStat label="Commandes" value={String(marketLive.length)} />
              <MiniStat label="Livrées" value={String(marketDelivered)} />
              <MiniStat label="Volume" value={compact(marketVolume)} />
            </div>
          </div>
        </Panel>

        <Panel title="Meilleurs commerçants" subtitle="Par volume de ventes ce mois">
          {topBusinesses.length === 0 ? (
            <Empty text="Aucune vente ce mois pour l'instant." />
          ) : (
            <ol className="space-y-1">
              {topBusinesses.map((b, idx) => (
                <li key={b.id}>
                  <Link
                    href={`/admin/commercants/${b.id}`}
                    className="flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-slate-50"
                  >
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                        idx === 0 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-slate-800">{b.name}</span>
                      <span className="text-xs text-slate-400">
                        {b.count} vente{b.count > 1 ? "s" : ""}
                      </span>
                    </span>
                    <span className="text-sm font-bold tabular-nums text-slate-900">{compact(b.total)}</span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </Panel>

        <Panel title="Essais qui finissent" subtitle="Le bon moment pour appeler" id="essais">
          {trialsEnding.length === 0 ? (
            <Empty text={`Aucun essai ne finit dans les ${TRIAL_ENDING_DAYS} prochains jours.`} />
          ) : (
            <ul className="space-y-1">
              {trialsEnding.slice(0, 6).map((s) => {
                const b = businessById.get(s.businessId);
                const days = Math.max(0, Math.ceil((new Date(s.trialEndsAt!).getTime() - now) / DAY_MS));
                return (
                  <li key={s.businessId}>
                    <Link
                      href={`/admin/commercants/${s.businessId}`}
                      className="flex items-center justify-between gap-3 rounded-xl px-2 py-2 transition hover:bg-slate-50"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-slate-800">{b?.name ?? "Commerce"}</span>
                        <span className="text-xs text-slate-400">Fin le {formatDate(s.trialEndsAt!)}</span>
                      </span>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${
                          days <= 1 ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {days === 0 ? "Aujourd'hui" : `J-${days}`}
                      </span>
                    </Link>
                  </li>
                );
              })}
              {trialsEnding.length > 6 && (
                <li className="px-2 pt-1 text-xs text-slate-400">et {trialsEnding.length - 6} autre(s) — voir le suivi</li>
              )}
            </ul>
          )}
          <Link
            href="/admin/suivi"
            className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-zindo-green-600 hover:underline"
          >
            Suivi des commerçants <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Panel>
      </section>
    </div>
  );
}

function HeroStat({
  label,
  value,
  delta,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string;
  delta?: number | null;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-2xl bg-white/[0.06] p-4 ring-1 ring-white/10 backdrop-blur">
      <div className="flex items-start gap-2 text-slate-400">
        <Icon className="h-4 w-4 shrink-0 text-zindo-green-400" />
        <p className="line-clamp-2 text-xs font-medium leading-tight">{label}</p>
      </div>
      <p className="mt-2 truncate text-xl font-extrabold tracking-tight sm:text-2xl">{value}</p>
      {delta !== undefined ? <DeltaBadge delta={delta} /> : <p className="mt-1 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

function DeltaBadge({ delta, light = false }: { delta: number | null; light?: boolean }) {
  const muted = "text-slate-400";
  if (delta === null) return <p className={`mt-1 text-xs ${muted}`}>Nouveau ce mois</p>;
  const up = delta >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  const tone = up ? (light ? "text-zindo-green-600" : "text-zindo-green-400") : light ? "text-red-600" : "text-red-400";
  return (
    <p className={`mt-1 flex items-center gap-1 text-xs ${muted}`}>
      <span className={`inline-flex items-center font-bold ${tone}`}>
        <Icon className="h-3.5 w-3.5" />
        {up ? "+" : ""}
        {delta} %
      </span>
      vs mois dernier
    </p>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-500">{title}</h2>;
}

function Panel({
  title,
  subtitle,
  icon: Icon,
  id,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <div id={id} className="scroll-mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="flex items-center gap-1.5 font-bold text-slate-900">
          {Icon && <Icon className="h-4 w-4 text-slate-400" />}
          {title}
        </h3>
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

/** Histogramme à une seule série : survol = infobulle, tableau lisible par les lecteurs d'écran. */
function BarChart({
  data,
  format,
}: {
  data: { label: string; value: number; tooltip: string }[];
  format: (n: number) => string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const lastIdx = data.length - 1;
  return (
    <div>
      <div className="flex h-48 items-end gap-[2px] border-b border-slate-200" aria-hidden="true">
        {data.map((d, idx) => (
          <div key={d.label} className="group relative flex h-full flex-1 flex-col justify-end">
            <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition group-hover:opacity-100">
              <span className="text-slate-400">{d.label} · </span>
              {d.tooltip}
            </div>
            {idx === lastIdx && d.value > 0 && (
              <span className="mb-1 text-center text-[11px] font-bold text-slate-700">{format(d.value)}</span>
            )}
            <div
              className={`mx-auto w-full max-w-10 rounded-t-[4px] transition ${
                idx === lastIdx ? "bg-zindo-green-500" : "bg-zindo-green-200 group-hover:bg-zindo-green-400"
              }`}
              style={{ height: `${(d.value / max) * 100}%`, minHeight: d.value > 0 ? 3 : 0 }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-[2px]" aria-hidden="true">
        {data.map((d, idx) => (
          <span
            key={d.label}
            className={`flex-1 truncate text-center text-[10px] text-slate-400 ${
              data.length > 8 && idx % 3 !== 0 && idx !== lastIdx ? "invisible sm:visible" : ""
            }`}
          >
            {d.label}
          </span>
        ))}
      </div>
      <table className="sr-only">
        <tbody>
          {data.map((d) => (
            <tr key={d.label}>
              <th scope="row">{d.label}</th>
              <td>{d.tooltip}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RankList({ rows, total }: { rows: [string, number][]; total: number }) {
  if (rows.length === 0) return <Empty text="Aucun commerce pour le moment." />;
  const max = rows[0][1] || 1;
  return (
    <ul className="space-y-2.5">
      {rows.map(([label, count]) => (
        <li key={label}>
          <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
            <span className="truncate text-slate-600">{label}</span>
            <span className="shrink-0 font-semibold tabular-nums text-slate-900">
              {count}
              <span className="ml-1.5 text-xs font-medium text-slate-400">{Math.round((count / (total || 1)) * 100)} %</span>
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-slate-700" style={{ width: `${(count / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-2 py-2.5">
      <p className="text-lg font-extrabold tabular-nums text-slate-900">{value}</p>
      <p className="text-[11px] text-slate-500">{label}</p>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-xl bg-slate-50 px-3 py-6 text-center text-sm text-slate-400">{text}</p>;
}
