import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Wrench } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { REPAIR_ACTIVITIES } from "@/lib/nav";
import { ensureRepairFlagRegistered, isRepairModuleEnabled, getRepairTicketAction, REPAIR_STATUS_LABELS } from "@/lib/actions/repairs";
import { supabase } from "@/lib/supabase";
import { formatMoney, formatDateTime } from "@/lib/format";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { RepairStatus } from "@/lib/db-types";
import { RepairStatusActions } from "./RepairStatusActions";
import { RepairDetailsForm } from "./RepairDetailsForm";
import { RepairItemsPanel } from "./RepairItemsPanel";
import { RepairPaymentPanel } from "./RepairPaymentPanel";

const STATUS_TONE: Record<RepairStatus, "zinc" | "blue" | "amber" | "emerald" | "red"> = {
  RECU: "zinc",
  DIAGNOSTIC: "blue",
  EN_COURS: "blue",
  ATTENTE_PIECES: "amber",
  TERMINE: "emerald",
  LIVRE: "emerald",
  ANNULE: "red",
};

export default async function RepairTicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission(PERMISSIONS.REPAIRS_MANAGE);
  if (!user.business.activityKey || !REPAIR_ACTIVITIES.includes(user.business.activityKey)) redirect("/dashboard");

  await ensureRepairFlagRegistered();
  if (!(await isRepairModuleEnabled(user.businessId))) redirect("/dashboard");

  const { id } = await params;
  const ticket = await getRepairTicketAction(id);
  if (!ticket) notFound();

  const { data: technicians } = await supabase
    .from("users")
    .select("id, firstName:first_name, lastName:last_name")
    .eq("business_id", user.businessId)
    .eq("active", true)
    .order("first_name", { ascending: true });

  const currency = user.business.currency;
  const remaining = ticket.total - ticket.amountPaid;
  const closed = ticket.status === "LIVRE" || ticket.status === "ANNULE";

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/reparations" className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700">
            <ArrowLeft className="h-4 w-4" /> Retour aux bons de réparation
          </Link>
          <div className="mt-1 flex items-center gap-2">
            <Wrench className="h-5 w-5 text-zinc-500" />
            <h1 className="text-xl font-bold text-zinc-900">
              {ticket.number} · {ticket.deviceType}
            </h1>
            <Badge tone={STATUS_TONE[ticket.status]}>{REPAIR_STATUS_LABELS[ticket.status]}</Badge>
          </div>
          <p className="text-sm text-zinc-500">{formatDateTime(new Date(ticket.createdAt))}</p>
        </div>
        {!closed && <RepairStatusActions ticketId={ticket.id} status={ticket.status} />}
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-zinc-900">Informations</h2>
        </CardHeader>
        <CardBody className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
          <Info label="Client" value={ticket.customer?.name ?? "Sans client"} />
          <Info label="Description appareil/engin" value={ticket.deviceDescription ?? "—"} />
          <div className="col-span-full">
            <p className="text-zinc-400">Panne signalée</p>
            <p className="text-zinc-700">{ticket.reportedIssue}</p>
          </div>
          {ticket.note && (
            <div className="col-span-full">
              <p className="text-zinc-400">Note interne</p>
              <p className="text-zinc-700">{ticket.note}</p>
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-zinc-900">Diagnostic & main-d&apos;œuvre</h2>
        </CardHeader>
        <CardBody>
          <RepairDetailsForm
            ticketId={ticket.id}
            diagnosis={ticket.diagnosis}
            laborCost={ticket.laborCost}
            discount={ticket.discount}
            technicianId={ticket.technician?.id ?? ""}
            technicians={(technicians ?? []).map((t) => ({ id: t.id as string, name: `${t.firstName} ${t.lastName}` }))}
            currency={currency}
            disabled={closed}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-zinc-900">Pièces utilisées</h2>
        </CardHeader>
        <CardBody>
          <RepairItemsPanel ticketId={ticket.id} items={ticket.items} locationId={ticket.locationId} currency={currency} disabled={closed} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-zinc-900">Facturation</h2>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <Info label="Main-d'œuvre" value={formatMoney(ticket.laborCost, currency)} />
            <Info label="Pièces" value={formatMoney(ticket.items.reduce((s, i) => s + i.total, 0), currency)} />
            <Info label="Remise" value={`- ${formatMoney(ticket.discount, currency)}`} />
            <Info label="Total" value={formatMoney(ticket.total, currency)} />
          </div>
          <RepairPaymentPanel ticketId={ticket.id} amountPaid={ticket.amountPaid} remaining={remaining} currency={currency} />
        </CardBody>
      </Card>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-zinc-400">{label}</p>
      <p className="font-medium text-zinc-900">{value}</p>
    </div>
  );
}
