import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { requireSuperAdmin } from "@/lib/superadmin-auth";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/format";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/Empty";
import { TicketReplyForm } from "./TicketReplyForm";

const STATUS_LABELS = {
  OUVERT: "Ouverte",
  EN_COURS: "En cours",
  RESOLU: "Résolue",
} as const;

const STATUS_TONE = {
  OUVERT: "amber",
  EN_COURS: "blue",
  RESOLU: "emerald",
} as const;

export default async function AdminSupportPage() {
  await requireSuperAdmin();

  const tickets = await prisma.supportTicket.findMany({
    include: { business: true, user: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  // Les demandes non traitées remontent en premier, peu importe leur date.
  const sorted = [...tickets].sort((a, b) => {
    if (a.status === "RESOLU" && b.status !== "RESOLU") return 1;
    if (a.status !== "RESOLU" && b.status === "RESOLU") return -1;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  const openCount = tickets.filter((t) => t.status !== "RESOLU").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Support</h1>
        <p className="text-sm text-zinc-500">
          {openCount} demande(s) à traiter sur {tickets.length} au total. Ouvrez la fiche du commerce pour
          consulter son compte à distance et diagnostiquer le problème.
        </p>
      </div>

      {sorted.length === 0 ? (
        <EmptyState title="Aucune demande de support pour le moment" />
      ) : (
        <div className="space-y-3">
          {sorted.map((t) => (
            <Card key={t.id}>
              <CardBody className="space-y-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-zinc-900">{t.subject}</p>
                    <p className="text-xs text-zinc-400">
                      <Link
                        href={`/admin/commercants/${t.businessId}`}
                        className="inline-flex items-center gap-1 font-medium text-zindo-orange-600 hover:underline"
                      >
                        {t.business.name} <ExternalLink className="h-3 w-3" />
                      </Link>{" "}
                      — {t.user.firstName} {t.user.lastName} — {formatDateTime(t.createdAt)}
                    </p>
                    {t.pageUrl && (
                      <p className="mt-0.5 font-mono text-xs text-zinc-400">Page : {t.pageUrl}</p>
                    )}
                  </div>
                  <Badge tone={STATUS_TONE[t.status]}>{STATUS_LABELS[t.status]}</Badge>
                </div>
                <p className="text-sm text-zinc-600">{t.message}</p>

                <TicketReplyForm ticketId={t.id} currentStatus={t.status} currentResponse={t.response} />
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
