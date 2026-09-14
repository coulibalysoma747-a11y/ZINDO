import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatDateTime, formatMoney } from "@/lib/format";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SuspendToggle } from "./SuspendToggle";
import { BusinessPlanSelect } from "../../abonnements/BusinessPlanSelect";
import { ResetPasswordButton } from "./ResetPasswordButton";
import { UserActiveToggle } from "../../utilisateurs/UserActiveToggle";
import { UserRoleSelect } from "../../utilisateurs/UserRoleSelect";

export default async function AdminBusinessDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const business = await prisma.business.findUnique({
    where: { id },
    include: {
      users: { orderBy: { createdAt: "asc" } },
      _count: { select: { sales: true, products: true, locations: true } },
      subscription: { include: { plan: true } },
    },
  });
  if (!business) notFound();

  const [totalRevenue, plans] = await Promise.all([
    prisma.sale.aggregate({
      where: { businessId: business.id, status: { not: "ANNULEE" } },
      _sum: { total: true },
    }),
    prisma.subscriptionPlan.findMany({ orderBy: { order: "asc" } }),
  ]);

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
        <SuspendToggle businessId={business.id} suspended={business.suspended} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardBody>
            <p className="text-xs text-zinc-500">Produits</p>
            <p className="text-lg font-bold text-zinc-900">{business._count.products}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-xs text-zinc-500">Ventes</p>
            <p className="text-lg font-bold text-zinc-900">{business._count.sales}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-xs text-zinc-500">Chiffre d&apos;affaires cumulé</p>
            <p className="text-lg font-bold text-zinc-900">
              {formatMoney(totalRevenue._sum.total ?? 0, business.currency)}
            </p>
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
            <p className="text-zinc-700">{business._count.locations}</p>
          </div>
          <div>
            <p className="text-zinc-400">Créé le</p>
            <p className="text-zinc-700">{formatDateTime(business.createdAt)}</p>
          </div>
          <div>
            <p className="mb-1 text-zinc-400">Abonnement</p>
            <BusinessPlanSelect
              businessId={business.id}
              planKey={business.subscription?.plan.key ?? null}
              billingCycle={business.subscription?.billingCycle ?? null}
              plans={plans}
            />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-zinc-900">Utilisateurs ({business.users.length})</h2>
        </CardHeader>
        <CardBody className="p-0">
          <table className="w-full text-sm">
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
              {business.users.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-2 text-zinc-900">
                    {u.firstName} {u.lastName}
                  </td>
                  <td className="px-4 py-2 text-zinc-600">{u.phone}{u.email ? ` — ${u.email}` : ""}</td>
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
                      <UserActiveToggle userId={u.id} active={u.active} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  );
}
