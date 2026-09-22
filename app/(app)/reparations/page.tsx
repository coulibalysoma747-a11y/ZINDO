import Link from "next/link";
import { redirect } from "next/navigation";
import { Wrench } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { REPAIR_ACTIVITIES } from "@/lib/nav";
import { getRepairTicketsAction, ensureRepairFlagRegistered, isRepairModuleEnabled } from "@/lib/actions/repairs";
import { REPAIR_STATUS_LABELS } from "@/lib/repair-status";
import { formatMoney, formatDateTime } from "@/lib/format";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Empty";
import type { RepairStatus } from "@/lib/db-types";

const STATUS_TONE: Record<RepairStatus, "zinc" | "blue" | "amber" | "emerald" | "red"> = {
  RECU: "zinc",
  DIAGNOSTIC: "blue",
  EN_COURS: "blue",
  ATTENTE_PIECES: "amber",
  TERMINE: "emerald",
  LIVRE: "emerald",
  ANNULE: "red",
};

export default async function RepairsPage({ searchParams }: { searchParams: Promise<{ statut?: string }> }) {
  const user = await requirePermission(PERMISSIONS.REPAIRS_MANAGE);
  if (!user.business.activityKey || !REPAIR_ACTIVITIES.includes(user.business.activityKey)) redirect("/dashboard");

  await ensureRepairFlagRegistered();
  if (!(await isRepairModuleEnabled(user.businessId))) redirect("/dashboard");

  const { statut } = await searchParams;
  const status = statut && statut in REPAIR_STATUS_LABELS ? (statut as RepairStatus) : undefined;
  const tickets = await getRepairTicketsAction(status ? { status } : undefined);
  const currency = user.business.currency;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Wrench className="h-5 w-5 text-zinc-500" />
          <div>
            <h1 className="text-xl font-bold text-zinc-900">Bons de réparation</h1>
            <p className="text-sm text-zinc-500">Suivi des appareils/engins pris en charge, de la réception à la restitution.</p>
          </div>
        </div>
        <ButtonLink href="/reparations/nouveau">Nouveau bon</ButtonLink>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/reparations"
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            !status ? "bg-zindo-ink-900 text-white" : "bg-white text-zinc-600 hover:bg-zinc-100"
          }`}
        >
          Tous
        </Link>
        {(Object.keys(REPAIR_STATUS_LABELS) as RepairStatus[]).map((s) => (
          <Link
            key={s}
            href={`/reparations?statut=${s}`}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              status === s ? "bg-zindo-ink-900 text-white" : "bg-white text-zinc-600 hover:bg-zinc-100"
            }`}
          >
            {REPAIR_STATUS_LABELS[s]}
          </Link>
        ))}
      </div>

      {tickets.length === 0 ? (
        <EmptyState title="Aucun bon de réparation" description="Créez un bon dès qu'un client dépose un appareil ou un engin." />
      ) : (
        <Card className="divide-y divide-zinc-100">
          {tickets.map((t) => (
            <Link key={t.id} href={`/reparations/${t.id}`} className="block">
              <CardBody className="flex flex-wrap items-center justify-between gap-3 hover:bg-zinc-50">
                <div>
                  <p className="font-medium text-zinc-900">
                    {t.number} · {t.deviceType}
                  </p>
                  <p className="line-clamp-1 text-xs text-zinc-500">{t.reportedIssue}</p>
                  <p className="text-xs text-zinc-400">
                    {t.customer?.name ?? "Sans client"} · {formatDateTime(new Date(t.createdAt))}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right text-sm">
                    <p className="font-semibold text-zinc-900">{formatMoney(t.total, currency)}</p>
                    {t.amountPaid < t.total && (
                      <p className="text-xs text-amber-600">Reste {formatMoney(t.total - t.amountPaid, currency)}</p>
                    )}
                  </div>
                  <Badge tone={STATUS_TONE[t.status]}>{REPAIR_STATUS_LABELS[t.status]}</Badge>
                </div>
              </CardBody>
            </Link>
          ))}
        </Card>
      )}
    </div>
  );
}
