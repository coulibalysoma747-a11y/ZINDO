import { notFound, redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { computeSessionStats } from "@/lib/cash-sessions";
import { CloseSessionForm } from "./CloseSessionForm";

export default async function CloseSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePermission(PERMISSIONS.CASH_SESSIONS_MANAGE);
  const { id } = await params;

  const session = await prisma.cashSession.findFirst({
    where: { id, businessId: user.businessId },
    include: { location: true, user: true },
  });
  if (!session) notFound();
  if (session.status === "FERMEE") redirect(`/ventes/session/${session.id}`);

  const stats = await computeSessionStats({
    businessId: session.businessId,
    locationId: session.locationId,
    openingAmount: session.openingAmount,
    openedAt: session.openedAt,
    closedAt: null,
  });

  return (
    <CloseSessionForm
      sessionId={session.id}
      sessionNumber={session.number}
      locationName={session.location.name}
      cashierName={`${session.user.firstName} ${session.user.lastName}`}
      openedAt={session.openedAt.toISOString()}
      openingAmount={session.openingAmount}
      currency={user.business.currency}
      stats={stats}
    />
  );
}
