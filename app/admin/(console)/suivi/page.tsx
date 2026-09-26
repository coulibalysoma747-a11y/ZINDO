import Link from "next/link";
import { MessageCircle, Phone } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/Empty";

const DAY_MS = 24 * 60 * 60 * 1000;
const INACTIVE_AFTER_DAYS = 7;
const TRIAL_ENDING_DAYS = 3;

type Health = "SUSPENDU" | "A_DEMARRER" | "JAMAIS_VENDU" | "ENDORMI" | "ACTIF";

const HEALTH_LABELS: Record<Health, string> = {
  SUSPENDU: "Suspendu",
  A_DEMARRER: "Aucun produit",
  JAMAIS_VENDU: "Jamais vendu",
  ENDORMI: "Endormi",
  ACTIF: "Actif",
};
const HEALTH_TONE = { SUSPENDU: "zinc", A_DEMARRER: "red", JAMAIS_VENDU: "amber", ENDORMI: "amber", ACTIF: "emerald" } as const;
// Ordre d'affichage : les commerces à appeler en premier.
const HEALTH_ORDER: Record<Health, number> = { A_DEMARRER: 0, JAMAIS_VENDU: 1, ENDORMI: 2, ACTIF: 3, SUSPENDU: 4 };

const FILTERS = [
  { value: "", label: "À relancer" },
  { value: "actifs", label: "Actifs" },
  { value: "tous", label: "Tous" },
] as const;

type BusinessRow = { id: string; name: string; phone: string | null; city: string | null; suspended: boolean; marketSeller: boolean | null; createdAt: string };
type OwnerRow = { businessId: string; phone: string | null; firstName: string; lastName: string; role: string };
type SubscriptionRow = { businessId: string; status: string; trialEndsAt: string | null; currentPeriodEnd: string | null };

type Activity = {
  productCount: number;
  sales7d: number;
  sales30d: number;
  lastSaleAt: string | null;
  lastActionAt: string | null;
};

/**
 * Quelques comptages par commerce, en parallèle (count exact sans rapatrier
 * les lignes : le plafond de 1 000 lignes de l'API ne s'applique pas). Suffit
 * pour quelques centaines de commerces ; au-delà, passer par une fonction SQL
 * qui agrège tout en une requête.
 */
async function loadActivity(businessId: string, now: number): Promise<Activity> {
  const since7 = new Date(now - 7 * DAY_MS).toISOString();
  const since30 = new Date(now - 30 * DAY_MS).toISOString();
  const [products, sales7, sales30, lastSale, lastAction] = await Promise.all([
    supabase.from("products").select("id", { count: "exact", head: true }).eq("business_id", businessId).eq("active", true),
    supabase.from("sales").select("id", { count: "exact", head: true }).eq("business_id", businessId).neq("status", "ANNULEE").gte("created_at", since7),
    supabase.from("sales").select("id", { count: "exact", head: true }).eq("business_id", businessId).neq("status", "ANNULEE").gte("created_at", since30),
    supabase.from("sales").select("createdAt:created_at").eq("business_id", businessId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("audit_logs").select("createdAt:created_at").eq("business_id", businessId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  return {
    productCount: products.count ?? 0,
    sales7d: sales7.count ?? 0,
    sales30d: sales30.count ?? 0,
    lastSaleAt: (lastSale.data?.createdAt as string | undefined) ?? null,
    lastActionAt: (lastAction.data?.createdAt as string | undefined) ?? null,
  };
}

function daysSince(iso: string | null, now: number): number | null {
  return iso ? Math.floor((now - new Date(iso).getTime()) / DAY_MS) : null;
}

function ago(days: number | null): string {
  if (days === null) return "Jamais";
  if (days <= 0) return "Aujourd'hui";
  if (days === 1) return "Hier";
  return `Il y a ${days} j`;
}

/** Numéro burkinabè à 8 chiffres → format international pour WhatsApp. */
function whatsappNumber(phone: string | null): string | null {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length === 8) return `226${digits}`;
  if (digits.length >= 10) return digits.replace(/^00/, "");
  return null;
}

async function loadFollowUpRows() {
  const now = Date.now();

  const [{ data: businessData }, { data: ownerData }, { data: subscriptionData }] = await Promise.all([
    supabase
      .from("businesses")
      .select("id, name, phone, city, suspended, marketSeller:market_seller, createdAt:created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("users")
      .select("businessId:business_id, phone, firstName:first_name, lastName:last_name, role")
      .eq("role", "ADMIN")
      .order("created_at", { ascending: true }),
    supabase
      .from("business_subscriptions")
      .select("businessId:business_id, status, trialEndsAt:trial_ends_at, currentPeriodEnd:current_period_end"),
  ]);

  // Les vendeurs du Marché sont gratuits à vie : rien à relancer.
  const businesses = ((businessData ?? []) as unknown as BusinessRow[]).filter((b) => !b.marketSeller);
  const owners = new Map<string, OwnerRow>();
  for (const o of (ownerData ?? []) as unknown as OwnerRow[]) if (!owners.has(o.businessId)) owners.set(o.businessId, o);
  const subscriptions = new Map(((subscriptionData ?? []) as unknown as SubscriptionRow[]).map((s) => [s.businessId, s]));

  const activities = await Promise.all(businesses.map((b) => loadActivity(b.id, now)));

  const rows = businesses.map((b, i) => {
    const a = activities[i];
    const sub = subscriptions.get(b.id);
    const lastActivityAt = [a.lastSaleAt, a.lastActionAt].filter(Boolean).sort().pop() ?? null;
    const inactiveDays = daysSince(lastActivityAt ?? b.createdAt, now);

    let health: Health;
    if (b.suspended) health = "SUSPENDU";
    else if (a.productCount === 0) health = "A_DEMARRER";
    else if (!a.lastSaleAt) health = "JAMAIS_VENDU";
    else if ((inactiveDays ?? 0) >= INACTIVE_AFTER_DAYS) health = "ENDORMI";
    else health = "ACTIF";

    const trialDaysLeft =
      sub?.status === "TRIAL" && sub.trialEndsAt ? Math.ceil((new Date(sub.trialEndsAt).getTime() - now) / DAY_MS) : null;
    const periodDaysLeft = sub?.currentPeriodEnd ? Math.ceil((new Date(sub.currentPeriodEnd).getTime() - now) / DAY_MS) : null;
    const trialEndingSoon = trialDaysLeft !== null && trialDaysLeft <= TRIAL_ENDING_DAYS;

    let subscriptionLabel = "Aucun";
    let subscriptionTone: "blue" | "emerald" | "red" | "amber" | "zinc" = "zinc";
    if (sub?.status === "TRIAL") {
      if (trialDaysLeft !== null && trialDaysLeft <= 0) {
        subscriptionLabel = "Essai terminé";
        subscriptionTone = "red";
      } else {
        subscriptionLabel = `Essai : ${trialDaysLeft} j restant(s)`;
        subscriptionTone = trialEndingSoon ? "amber" : "blue";
      }
    } else if (sub?.status === "ACTIVE") {
      const expired = periodDaysLeft !== null && periodDaysLeft <= 0;
      subscriptionLabel = expired ? "Abonnement expiré" : `Payé : ${periodDaysLeft ?? "?"} j restant(s)`;
      subscriptionTone = expired ? "red" : periodDaysLeft !== null && periodDaysLeft <= 7 ? "amber" : "emerald";
    } else if (sub) {
      subscriptionLabel = sub.status === "PAST_DUE" ? "Impayé" : "Expiré";
      subscriptionTone = "red";
    }

    const owner = owners.get(b.id);
    const phone = owner?.phone || b.phone;
    const needsFollowUp = health !== "ACTIF" && health !== "SUSPENDU";
    return { b, a, health, lastActivityAt, inactiveDays, subscriptionLabel, subscriptionTone, trialEndingSoon, owner, phone, needsFollowUp };
  });

  return { rows, now };
}

export default async function AdminFollowUpPage({ searchParams }: { searchParams: Promise<{ filtre?: string }> }) {
  const { filtre = "" } = await searchParams;
  const { rows, now } = await loadFollowUpRows();
  const toFollowUp = rows.filter((r) => r.needsFollowUp || r.trialEndingSoon);
  const visible = (filtre === "tous" ? rows : filtre === "actifs" ? rows.filter((r) => r.health === "ACTIF") : toFollowUp).sort(
    (x, y) =>
      Number(y.trialEndingSoon) - Number(x.trialEndingSoon) ||
      HEALTH_ORDER[x.health] - HEALTH_ORDER[y.health] ||
      (y.inactiveDays ?? 0) - (x.inactiveDays ?? 0)
  );

  const counts = {
    aDemarrer: rows.filter((r) => r.health === "A_DEMARRER").length,
    jamaisVendu: rows.filter((r) => r.health === "JAMAIS_VENDU").length,
    endormis: rows.filter((r) => r.health === "ENDORMI").length,
    actifs: rows.filter((r) => r.health === "ACTIF").length,
    essaisFinissant: rows.filter((r) => r.trialEndingSoon).length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Suivi des commerçants</h1>
        <p className="max-w-2xl text-sm text-zinc-500">
          Qui utilise vraiment ZINDO, et qui appeler avant qu&apos;il parte. « Endormi » : aucune vente ni action depuis{" "}
          {INACTIVE_AFTER_DAYS} jours. Les vendeurs du Marché (gratuits) ne sont pas listés.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { label: "Aucun produit saisi", value: counts.aDemarrer, tone: "text-red-600" },
          { label: "Jamais vendu", value: counts.jamaisVendu, tone: "text-amber-600" },
          { label: "Endormis", value: counts.endormis, tone: "text-amber-600" },
          { label: `Essai fini sous ${TRIAL_ENDING_DAYS} j`, value: counts.essaisFinissant, tone: "text-amber-600" },
          { label: "Actifs", value: counts.actifs, tone: "text-emerald-600" },
        ].map((s) => (
          <Card key={s.label} className="p-4">
            <p className="text-xs text-zinc-500">{s.label}</p>
            <p className={`mt-1 text-2xl font-bold ${s.tone}`}>{s.value}</p>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.value}
            href={f.value ? `/admin/suivi?filtre=${f.value}` : "/admin/suivi"}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              filtre === f.value ? "bg-zindo-green-600 text-white" : "bg-white text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-50"
            }`}
          >
            {f.label}
            {f.value === "" && ` (${toFollowUp.length})`}
          </Link>
        ))}
      </div>

      {visible.length === 0 ? (
        <EmptyState title="Personne à relancer" description="Tous les commerces sont actifs pour le moment." />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-zinc-50 text-left text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">Commerce</th>
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="px-4 py-3 font-medium">État</th>
                <th className="px-4 py-3 font-medium">Abonnement</th>
                <th className="px-4 py-3 font-medium">Produits</th>
                <th className="px-4 py-3 font-medium">Ventes 7 j / 30 j</th>
                <th className="px-4 py-3 font-medium">Dernière vente</th>
                <th className="px-4 py-3 font-medium">Dernière activité</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {visible.map(({ b, a, health, inactiveDays, subscriptionLabel, subscriptionTone, owner, phone }) => {
                const wa = whatsappNumber(phone);
                return (
                  <tr key={b.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-3">
                      <Link href={`/admin/commercants/${b.id}`} className="font-medium text-zindo-green-600 hover:underline">
                        {b.name}
                      </Link>
                      <p className="text-xs text-zinc-400">
                        {b.city ? `${b.city} · ` : ""}inscrit le {formatDate(b.createdAt)}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-zinc-600">
                      {owner && <p>{`${owner.firstName} ${owner.lastName}`.trim()}</p>}
                      {phone ? (
                        <div className="flex items-center gap-2 text-xs">
                          <a href={`tel:${phone}`} className="inline-flex items-center gap-1 text-zinc-500 hover:text-zinc-900">
                            <Phone className="h-3 w-3" /> {phone}
                          </a>
                          {wa && (
                            <a
                              href={`https://wa.me/${wa}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-emerald-600 hover:underline"
                            >
                              <MessageCircle className="h-3 w-3" /> WhatsApp
                            </a>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-zinc-400">Pas de numéro</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={HEALTH_TONE[health]}>{HEALTH_LABELS[health]}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={subscriptionTone}>{subscriptionLabel}</Badge>
                    </td>
                    <td className="px-4 py-3 text-zinc-600">{a.productCount}</td>
                    <td className="px-4 py-3 text-zinc-600">
                      {a.sales7d} / {a.sales30d}
                    </td>
                    <td className="px-4 py-3 text-zinc-600">{ago(daysSince(a.lastSaleAt, now))}</td>
                    <td className="px-4 py-3 text-zinc-600">{ago(inactiveDays)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
