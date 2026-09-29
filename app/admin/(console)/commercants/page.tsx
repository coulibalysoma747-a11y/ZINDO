import Link from "next/link";
import { MessageCircle, Search } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/format";
import { toWhatsAppDigits } from "@/lib/countries";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/Empty";
import { maintenant, situation, type SubscriptionRow } from "@/lib/abonnement-situation";

type BusinessRow = {
  id: string;
  name: string;
  activity: string | null;
  city: string | null;
  country: string | null;
  phone: string | null;
  suspended: boolean;
  createdAt: string;
};

const FILTRES: { key: string; label: string }[] = [
  { key: "", label: "Tous" },
  { key: "payant", label: "Payants" },
  { key: "essai", label: "En essai" },
  { key: "fin", label: "Essai fini sous 3 j" },
  { key: "expire", label: "Expirés" },
  { key: "suspendu", label: "Suspendus" },
];

function normalize(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export default async function AdminBusinessesPage({ searchParams }: { searchParams: Promise<{ q?: string; statut?: string }> }) {
  const { q = "", statut = "" } = await searchParams;
  const [{ data }, { data: subs }, { data: users }, { data: sales }] = await Promise.all([
    supabase.from("businesses").select("id, name, activity, city, country, phone, suspended, createdAt:created_at").order("created_at", { ascending: false }),
    supabase
      .from("business_subscriptions")
      .select("businessId:business_id, status, billingCycle:billing_cycle, trialEndsAt:trial_ends_at, currentPeriodEnd:current_period_end"),
    supabase.from("users").select("businessId:business_id, phone, role"),
    supabase.from("sales").select("businessId:business_id, createdAt:created_at"),
  ]);
  const businesses = (data ?? []) as unknown as BusinessRow[];
  const subByBusiness = new Map(((subs ?? []) as unknown as SubscriptionRow[]).map((s) => [s.businessId, s]));

  const userCounts = new Map<string, number>();
  const ownerPhone = new Map<string, string>();
  for (const u of (users ?? []) as Array<{ businessId: string; phone: string | null; role: string }>) {
    userCounts.set(u.businessId, (userCounts.get(u.businessId) ?? 0) + 1);
    if (u.phone && (u.role === "ADMIN" || !ownerPhone.has(u.businessId))) ownerPhone.set(u.businessId, u.phone);
  }
  const saleCounts = new Map<string, number>();
  const lastSale = new Map<string, string>();
  for (const s of (sales ?? []) as Array<{ businessId: string; createdAt: string }>) {
    saleCounts.set(s.businessId, (saleCounts.get(s.businessId) ?? 0) + 1);
    if (!lastSale.has(s.businessId) || s.createdAt > lastSale.get(s.businessId)!) lastSale.set(s.businessId, s.createdAt);
  }

  const now = maintenant();
  const rows = businesses.map((b) => ({ b, s: situation(b, subByBusiness.get(b.id), now), phone: ownerPhone.get(b.id) ?? b.phone }));
  const compte = {
    payant: rows.filter((r) => r.s.etat === "payant").length,
    essai: rows.filter((r) => r.s.etat === "essai").length,
    fin: rows.filter((r) => r.s.etat === "essai" && (r.s.joursRestants ?? 99) <= 3).length,
    expire: rows.filter((r) => r.s.etat === "expire").length,
  };

  const terme = normalize(q.trim());
  const visibles = rows.filter(({ b, s, phone }) => {
    if (statut === "fin" ? !(s.etat === "essai" && (s.joursRestants ?? 99) <= 3) : statut && s.etat !== statut) return false;
    if (!terme) return true;
    return [b.name, b.city ?? "", b.activity ?? "", phone ?? ""].some((v) => normalize(v).includes(terme));
  });

  function lien(nouveauStatut: string) {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (nouveauStatut) p.set("statut", nouveauStatut);
    const s = p.toString();
    return s ? `?${s}` : "?";
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Commerçants</h1>
        <p className="mt-1 text-sm text-zinc-500">{businesses.length} commerce(s) enregistré(s) sur la plateforme</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[
          ["Commerces", businesses.length, "text-zinc-900"],
          ["Abonnés payants", compte.payant, "text-zindo-green-700"],
          ["En essai", compte.essai, "text-sky-700"],
          ["Essai fini sous 3 j", compte.fin, "text-amber-700"],
          ["Expirés", compte.expire, "text-red-700"],
        ].map(([label, value, tone]) => (
          <div key={label as string} className="rounded-xl border border-zinc-200 bg-white p-4">
            <p className="text-xs text-zinc-500">{label}</p>
            <p className={`mt-1 text-2xl font-semibold tabular-nums ${tone}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <form className="relative flex-1" action="">
          {statut && <input type="hidden" name="statut" value={statut} />}
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Rechercher par nom, ville, activité ou téléphone…"
            className="h-10 w-full rounded-lg border border-zinc-300 bg-white pl-9 pr-3 text-sm outline-none focus:border-zindo-green-500 focus:ring-4 focus:ring-zindo-green-500/15"
          />
        </form>
        <div className="flex flex-wrap gap-1.5">
          {FILTRES.map((f) => (
            <Link
              key={f.key}
              href={lien(f.key)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                statut === f.key ? "bg-zinc-900 text-white" : "border border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400"
              }`}
            >
              {f.label}
            </Link>
          ))}
        </div>
      </div>

      {visibles.length === 0 ? (
        <EmptyState title="Aucun commerçant ne correspond" description="Modifiez la recherche ou le filtre." />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-zinc-50 text-left text-xs text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">Commerce</th>
                <th className="px-4 py-3 font-medium">Activité</th>
                <th className="px-4 py-3 font-medium">Abonnement</th>
                <th className="whitespace-nowrap px-4 py-3 font-medium">Fin</th>
                <th className="whitespace-nowrap px-4 py-3 font-medium">Dernière vente</th>
                <th className="px-4 py-3 text-right font-medium">Ventes</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {visibles.map(({ b, s, phone }) => {
                const derniere = lastSale.get(b.id);
                const wa = phone ? toWhatsAppDigits(phone, b.country) : "";
                return (
                  <tr key={b.id} className="hover:bg-zinc-50/60">
                    <td className="px-4 py-3">
                      <Link href={`/admin/commercants/${b.id}`} className="font-medium text-zinc-900 hover:text-zindo-green-700">
                        {b.name}
                      </Link>
                      <p className="text-xs text-zinc-500">
                        {[b.city, `${userCounts.get(b.id) ?? 0} utilisateur(s)`, `créé le ${formatDate(b.createdAt)}`].filter(Boolean).join(" · ")}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-zinc-600">{b.activity ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${s.tone}`}>{s.label}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-zinc-600">{s.fin ? formatDate(s.fin) : "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-zinc-600">{derniere ? formatDate(derniere) : <span className="text-zinc-400">Aucune</span>}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-zinc-700">{saleCounts.get(b.id) ?? 0}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {wa && (
                          <a
                            href={`https://wa.me/${wa}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Écrire à ${b.name} sur WhatsApp`}
                            className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:border-[#25D366] hover:text-[#128C7E]"
                          >
                            <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                          </a>
                        )}
                        <Link
                          href={`/admin/commercants/${b.id}`}
                          className="rounded-lg bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-zinc-700"
                        >
                          Ouvrir
                        </Link>
                      </div>
                    </td>
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
