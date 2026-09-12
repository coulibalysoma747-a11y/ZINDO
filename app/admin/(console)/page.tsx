import Link from "next/link";
import { Store, Users, ShoppingCart, ShieldOff, LifeBuoy } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/format";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default async function AdminDashboardPage() {
  const [businessCount, userCount, saleCount, suspendedCount, openTicketCount, recentBusinesses] =
    await Promise.all([
      prisma.business.count(),
      prisma.user.count(),
      prisma.sale.count(),
      prisma.business.count({ where: { suspended: true } }),
      prisma.supportTicket.count({ where: { status: { not: "RESOLU" } } }),
      prisma.business.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        include: { _count: { select: { users: true } } },
      }),
    ]);

  const stats = [
    { label: "Commerçants", value: businessCount, icon: Store, tone: "text-zindo-orange-600 bg-zindo-orange-50" },
    { label: "Utilisateurs", value: userCount, icon: Users, tone: "text-zindo-navy-700 bg-zindo-navy-50" },
    { label: "Ventes enregistrées", value: saleCount, icon: ShoppingCart, tone: "text-emerald-600 bg-emerald-50" },
    { label: "Commerces suspendus", value: suspendedCount, icon: ShieldOff, tone: "text-red-600 bg-red-50" },
    {
      label: "Support à traiter",
      value: openTicketCount,
      icon: LifeBuoy,
      tone: "text-amber-600 bg-amber-50",
      href: "/admin/support",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Tableau de bord</h1>
        <p className="text-sm text-zinc-500">Vue d&apos;ensemble de la plateforme ZINDO</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((s) => {
          const content = (
            <CardBody className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${s.tone}`}>
                <s.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-zinc-500">{s.label}</p>
                <p className="text-lg font-bold text-zinc-900">{s.value}</p>
              </div>
            </CardBody>
          );
          return s.href ? (
            <Link key={s.label} href={s.href}>
              <Card className="transition hover:border-zindo-orange-300 hover:shadow-md">{content}</Card>
            </Link>
          ) : (
            <Card key={s.label}>{content}</Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-zinc-900">Commerçants récents</h2>
        </CardHeader>
        <CardBody className="p-0">
          {recentBusinesses.length === 0 ? (
            <p className="p-5 text-sm text-zinc-500">Aucun commerçant pour le moment.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-left text-zinc-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Nom</th>
                  <th className="px-4 py-2 font-medium">Utilisateurs</th>
                  <th className="px-4 py-2 font-medium">Plan</th>
                  <th className="px-4 py-2 font-medium">Statut</th>
                  <th className="px-4 py-2 font-medium">Créé le</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {recentBusinesses.map((b) => (
                  <tr key={b.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-2">
                      <Link href={`/admin/commercants/${b.id}`} className="font-medium text-zindo-orange-600 hover:underline">
                        {b.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-zinc-600">{b._count.users}</td>
                    <td className="px-4 py-2 text-zinc-600">{b.plan}</td>
                    <td className="px-4 py-2">
                      {b.suspended ? <Badge tone="red">Suspendu</Badge> : <Badge tone="emerald">Actif</Badge>}
                    </td>
                    <td className="px-4 py-2 text-zinc-600">{formatDateTime(b.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
