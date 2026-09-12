import { notFound, redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { SessionReportView } from "./SessionReportView";

export default async function SessionReportPage({
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
  if (session.status === "OUVERTE") redirect(`/ventes/session/${session.id}/fermer`);

  return (
    <SessionReportView
      data={{
        businessName: user.business.name,
        locationName: session.location.name,
        sessionNumber: session.number,
        cashierName: `${session.user.firstName} ${session.user.lastName}`,
        openedAt: session.openedAt,
        closedAt: session.closedAt!,
        salesCount: session.salesCount ?? 0,
        totalRevenue: session.totalRevenue ?? 0,
        cashCollected: session.cashCollected ?? 0,
        mobileCollected: session.mobileCollected ?? 0,
        cardCollected: session.cardCollected ?? 0,
        otherCollected: session.otherCollected ?? 0,
        creditCollected: session.creditCollected ?? 0,
        grossMargin: session.grossMargin ?? 0,
        expensesTotal: session.expensesTotal ?? 0,
        netMargin: session.netMargin ?? 0,
        marginRate: session.marginRate ?? 0,
        openingAmount: session.openingAmount,
        expectedCash: session.expectedCash ?? 0,
        countedCash: session.countedCash ?? 0,
        variance: session.variance ?? 0,
        note: session.note,
        currency: user.business.currency,
      }}
    />
  );
}
