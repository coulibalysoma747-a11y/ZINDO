import { ShieldCheck, ShieldX, LogIn, ListChecks } from "lucide-react";
import { requireFounder } from "@/lib/superadmin-auth";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/format";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/Empty";

const ACTION_LABELS: Record<string, string> = {
  CREATE: "Création",
  DELETE: "Suppression",
  SUSPEND: "Suspension",
  REACTIVATE: "Réactivation",
  DEACTIVATE: "Désactivation",
  UPDATE_PLAN: "Changement de plan",
  SET: "Modification",
  RESET: "Réinitialisation",
  UPDATE: "Modification",
  ENABLE_ALL: "Activation globale",
  DISABLE_ALL: "Désactivation globale",
};

const ENTITY_LABELS: Record<string, string> = {
  Business: "Commerçant",
  User: "Utilisateur",
  SuperAdmin: "Administrateur",
  GlobalRolePermission: "Permission par défaut",
  UserPermission: "Module (compte)",
  FeatureFlag: "Fonctionnalité",
  FeatureFlagBusiness: "Fonctionnalité (commerce)",
  ActivityConfig: "Activité",
};

export default async function AdminSecurityPage() {
  await requireFounder();

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [loginEvents, auditLogs, successCount7d, failCount7d, adminCount] = await Promise.all([
    prisma.superAdminLoginEvent.findMany({ orderBy: { createdAt: "desc" }, take: 200 }),
    prisma.superAdminAuditLog.findMany({ orderBy: { createdAt: "desc" }, take: 200 }),
    prisma.superAdminLoginEvent.count({ where: { success: true, createdAt: { gte: sevenDaysAgo } } }),
    prisma.superAdminLoginEvent.count({ where: { success: false, createdAt: { gte: sevenDaysAgo } } }),
    prisma.superAdmin.count(),
  ]);

  const stats = [
    { label: "Connexions réussies (7j)", value: successCount7d, icon: LogIn, tone: "text-emerald-600 bg-emerald-50" },
    { label: "Échecs de connexion (7j)", value: failCount7d, icon: ShieldX, tone: "text-red-600 bg-red-50" },
    { label: "Administrateurs", value: adminCount, icon: ShieldCheck, tone: "text-zindo-orange-600 bg-zindo-orange-50" },
    { label: "Actions enregistrées", value: auditLogs.length, icon: ListChecks, tone: "text-zindo-navy-700 bg-zindo-navy-50" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Sécurité</h1>
        <p className="text-sm text-zinc-500">Connexions à la console et actions sensibles effectuées sur la plateforme.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardBody className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${s.tone}`}>
                <s.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-zinc-500">{s.label}</p>
                <p className="text-lg font-bold text-zinc-900">{s.value}</p>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-zinc-900">Connexions</h2>
        </CardHeader>
        {loginEvents.length === 0 ? (
          <CardBody>
            <EmptyState title="Aucune tentative de connexion enregistrée" />
          </CardBody>
        ) : (
          <CardBody className="overflow-x-auto p-0">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="bg-zinc-50 text-left text-zinc-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Compte</th>
                  <th className="px-4 py-3 font-medium">Résultat</th>
                  <th className="px-4 py-3 font-medium">Adresse IP</th>
                  <th className="px-4 py-3 font-medium">Appareil</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {loginEvents.map((ev) => (
                  <tr key={ev.id}>
                    <td className="px-4 py-3 text-zinc-600">{formatDateTime(ev.createdAt)}</td>
                    <td className="px-4 py-3 text-zinc-900">{ev.actorName ?? ev.email}</td>
                    <td className="px-4 py-3">
                      {ev.success ? <Badge tone="emerald">Réussie</Badge> : <Badge tone="red">Échec</Badge>}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-zinc-500">{ev.ipAddress ?? "—"}</td>
                    <td className="max-w-[280px] truncate px-4 py-3 text-xs text-zinc-400" title={ev.userAgent ?? undefined}>
                      {ev.userAgent ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        )}
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-zinc-900">Activités sensibles</h2>
        </CardHeader>
        {auditLogs.length === 0 ? (
          <CardBody>
            <EmptyState title="Aucune action enregistrée pour le moment" />
          </CardBody>
        ) : (
          <CardBody className="overflow-x-auto p-0">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="bg-zinc-50 text-left text-zinc-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Administrateur</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                  <th className="px-4 py-3 font-medium">Élément</th>
                  <th className="px-4 py-3 font-medium">Détails</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="px-4 py-3 text-zinc-600">{formatDateTime(log.createdAt)}</td>
                    <td className="px-4 py-3 text-zinc-900">{log.actorName}</td>
                    <td className="px-4 py-3 text-zinc-600">{ACTION_LABELS[log.action] ?? log.action}</td>
                    <td className="px-4 py-3 text-zinc-600">{ENTITY_LABELS[log.entity] ?? log.entity}</td>
                    <td className="px-4 py-3 text-zinc-600">{log.details ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        )}
      </Card>
    </div>
  );
}
