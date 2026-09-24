import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentSuperAdmin } from "@/lib/superadmin-auth";
import { supabase } from "@/lib/supabase";
import { ACTIVE_PLAN_KEY } from "@/lib/subscription";
import { formatDateTime, formatMoney } from "@/lib/format";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SuspendToggle } from "./SuspendToggle";
import { DeleteBusinessButton } from "./DeleteBusinessButton";
import { BusinessPlanSelect } from "../../abonnements/BusinessPlanSelect";
import { ResetPasswordButton } from "./ResetPasswordButton";
import { ImpersonateButton } from "./ImpersonateButton";
import { ForceCloseSessionButton } from "./ForceCloseSessionButton";
import { UserActiveToggle } from "../../utilisateurs/UserActiveToggle";
import { UserRoleSelect } from "../../utilisateurs/UserRoleSelect";

type BusinessRow = {
  id: string;
  name: string;
  suspended: boolean;
  activity: string | null;
  city: string | null;
  country: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  currency: string;
  createdAt: string;
};
type UserRow = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  role: "ADMIN" | "VENDEUR" | "GESTIONNAIRE_STOCK";
  active: boolean;
};
type OpenSessionRow = {
  id: string;
  openedAt: string;
  location: { name: string } | null;
  user: { firstName: string; lastName: string } | null;
};

export default async function AdminBusinessDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = await getCurrentSuperAdmin();
  const isFounder = admin?.role === "FOUNDER";

  const { data: businessData } = await supabase
    .from("businesses")
    .select("id, name, suspended, activity, city, country, phone, email, address, currency, createdAt:created_at")
    .eq("id", id)
    .maybeSingle();
  if (!businessData) notFound();
  const business = businessData as unknown as BusinessRow;

  const [
    { data: usersData },
    { count: productCount },
    { count: salesCount },
    { count: locationCount },
    { data: salesForRevenue },
    { data: subscriptionData },
    { data: plansData },
    { data: openSessionsData },
  ] = await Promise.all([
    supabase
      .from("users")
      .select("id, firstName:first_name, lastName:last_name, phone, email, role, active")
      .eq("business_id", id)
      .order("created_at", { ascending: true }),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("business_id", id),
    supabase.from("sales").select("id", { count: "exact", head: true }).eq("business_id", id),
    supabase.from("locations").select("id", { count: "exact", head: true }).eq("business_id", id),
    supabase.from("sales").select("total").eq("business_id", id).neq("status", "ANNULEE"),
    supabase
      .from("business_subscriptions")
      .select("billingCycle:billing_cycle, plan:subscription_plans(key)")
      .eq("business_id", id)
      .maybeSingle(),
    supabase.from("subscription_plans").select("key, label").eq("key", ACTIVE_PLAN_KEY),
    supabase
      .from("cash_sessions")
      .select("id, openedAt:opened_at, location:locations(name), user:users(firstName:first_name, lastName:last_name)")
      .eq("business_id", id)
      .eq("status", "OUVERTE")
      .order("opened_at", { ascending: true }),
  ]);
  const users = (usersData ?? []) as unknown as UserRow[];
  const totalRevenue = ((salesForRevenue ?? []) as Array<{ total: number }>).reduce((s, sale) => s + sale.total, 0);
  const subscription = subscriptionData as unknown as { billingCycle: "MONTHLY" | "ANNUAL"; plan: { key: string } } | null;
  const plans = (plansData ?? []) as unknown as Array<{ key: string; label: string }>;
  const openSessions = (openSessionsData ?? []) as unknown as OpenSessionRow[];

  return (
    <div className="space-y-6">
      <Link href="/admin/commercants" className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700">
        <ArrowLeft className="h-4 w-4" /> Retour aux commerçants
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-zinc-900">{business.name}</h1>
            {business.suspended ? <Badge tone="red">Suspendu</Badge> : <Badge tone="emerald">Actif</Badge>}
          </div>
          <p className="text-sm text-zinc-500">
            {business.activity ?? "Activité non renseignée"} — {business.city ?? "—"}, {business.country}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SuspendToggle businessId={business.id} suspended={business.suspended} />
          {isFounder && <DeleteBusinessButton businessId={business.id} businessName={business.name} />}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardBody>
            <p className="text-xs text-zinc-500">Produits</p>
            <p className="text-lg font-bold text-zinc-900">{productCount ?? 0}</p>
          </CardBody>
        </Card>
        <Link href={`/admin/commercants/${business.id}/ventes`}>
          <Card className="transition-colors hover:border-zindo-green-300">
            <CardBody>
              <p className="text-xs text-zinc-500">Ventes</p>
              <p className="text-lg font-bold text-zinc-900">{salesCount ?? 0}</p>
              <p className="mt-0.5 text-xs text-zindo-green-600">Voir / corriger →</p>
            </CardBody>
          </Card>
        </Link>
        <Card>
          <CardBody>
            <p className="text-xs text-zinc-500">Chiffre d&apos;affaires cumulé</p>
            <p className="text-lg font-bold text-zinc-900">{formatMoney(totalRevenue, business.currency)}</p>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-zinc-900">Informations</h2>
        </CardHeader>
        <CardBody className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <p className="text-zinc-400">Téléphone</p>
            <p className="text-zinc-700">{business.phone ?? "—"}</p>
          </div>
          <div>
            <p className="text-zinc-400">E-mail</p>
            <p className="text-zinc-700">{business.email ?? "—"}</p>
          </div>
          <div>
            <p className="text-zinc-400">Adresse</p>
            <p className="text-zinc-700">{business.address ?? "—"}</p>
          </div>
          <div>
            <p className="text-zinc-400">Boutiques / dépôts</p>
            <p className="text-zinc-700">{locationCount ?? 0}</p>
          </div>
          <div>
            <p className="text-zinc-400">Créé le</p>
            <p className="text-zinc-700">{formatDateTime(new Date(business.createdAt))}</p>
          </div>
          <div>
            <p className="mb-1 text-zinc-400">Abonnement</p>
            <BusinessPlanSelect
              businessId={business.id}
              planKey={subscription?.plan.key ?? null}
              billingCycle={subscription?.billingCycle ?? null}
              plans={plans}
            />
          </div>
        </CardBody>
      </Card>

      {openSessions.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-zinc-900">Sessions de caisse ouvertes ({openSessions.length})</h2>
            <p className="text-xs text-zinc-500">
              Une seule session ouverte par boutique bloque toute nouvelle vente ailleurs sur cette boutique tant
              qu&apos;elle n&apos;est pas clôturée — utile si un employé n&apos;est plus joignable pour la fermer
              lui-même.
            </p>
          </CardHeader>
          <CardBody className="space-y-2">
            {openSessions.map((s) => (
              <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-100 p-3 text-sm">
                <div>
                  <p className="font-medium text-zinc-900">{s.location?.name ?? "Boutique inconnue"}</p>
                  <p className="text-xs text-zinc-500">
                    Ouverte par {s.user ? `${s.user.firstName} ${s.user.lastName}` : "utilisateur inconnu"} —{" "}
                    {formatDateTime(new Date(s.openedAt))}
                  </p>
                </div>
                <ForceCloseSessionButton businessId={business.id} sessionId={s.id} locationName={s.location?.name ?? "cette boutique"} />
              </div>
            ))}
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-zinc-900">Utilisateurs ({users.length})</h2>
        </CardHeader>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead className="bg-zinc-50 text-left text-zinc-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Nom</th>
                  <th className="px-4 py-2 font-medium">Contact</th>
                  <th className="px-4 py-2 font-medium">Rôle</th>
                  <th className="px-4 py-2 font-medium">Statut</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="px-4 py-2 text-zinc-900">
                      {u.firstName} {u.lastName}
                    </td>
                    <td className="px-4 py-2 text-zinc-600">
                      {u.phone}
                      {u.email ? ` — ${u.email}` : ""}
                    </td>
                    <td className="px-4 py-2">
                      <UserRoleSelect userId={u.id} role={u.role} />
                    </td>
                    <td className="px-4 py-2">
                      {u.active ? <Badge tone="emerald">Actif</Badge> : <Badge tone="zinc">Désactivé</Badge>}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/commercants/${business.id}/utilisateurs/${u.id}`}
                          className="rounded-lg border border-zindo-green-200 px-2.5 py-1.5 text-xs font-medium text-zindo-green-600 hover:bg-zindo-green-50"
                        >
                          Modules
                        </Link>
                        <ResetPasswordButton userId={u.id} userName={`${u.firstName} ${u.lastName}`} />
                        {isFounder && u.active && (
                          <ImpersonateButton userId={u.id} userName={`${u.firstName} ${u.lastName}`} />
                        )}
                        <UserActiveToggle userId={u.id} active={u.active} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
