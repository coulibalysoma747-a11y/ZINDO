import { notFound, redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { SessionReportView } from "./SessionReportView";
import { buildEveningReportText, isEveningReportEnabled } from "@/lib/evening-report";

type SessionRow = {
  id: string;
  number: string;
  status: string;
  openedAt: string;
  closedAt: string | null;
  openingAmount: number;
  salesCount: number | null;
  totalRevenue: number | null;
  cashCollected: number | null;
  mobileCollected: number | null;
  cardCollected: number | null;
  otherCollected: number | null;
  creditCollected: number | null;
  grossMargin: number | null;
  expensesTotal: number | null;
  netMargin: number | null;
  marginRate: number | null;
  expectedCash: number | null;
  countedCash: number | null;
  variance: number | null;
  note: string | null;
  location: { name: string };
  user: { firstName: string; lastName: string };
};

export default async function SessionReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePermission(PERMISSIONS.CASH_SESSIONS_MANAGE);
  const { id } = await params;

  const { data } = await supabase
    .from("cash_sessions")
    .select(
      "id, number, status, openedAt:opened_at, closedAt:closed_at, openingAmount:opening_amount, salesCount:sales_count, totalRevenue:total_revenue, cashCollected:cash_collected, mobileCollected:mobile_collected, cardCollected:card_collected, otherCollected:other_collected, creditCollected:credit_collected, grossMargin:gross_margin, expensesTotal:expenses_total, netMargin:net_margin, marginRate:margin_rate, expectedCash:expected_cash, countedCash:counted_cash, variance, note, location:locations(name), user:users(firstName:first_name, lastName:last_name)"
    )
    .eq("id", id)
    .eq("business_id", user.businessId)
    .maybeSingle();
  if (!data) notFound();
  const session = data as unknown as SessionRow;
  if (session.status === "OUVERTE") redirect(`/ventes/session/${session.id}/fermer`);

  const cashierName = `${session.user.firstName} ${session.user.lastName}`;
  const eveningReportText = (await isEveningReportEnabled(user.businessId))
    ? await buildEveningReportText({
        sessionId: session.id,
        businessId: user.businessId,
        locationName: session.location.name,
        closedAt: new Date(session.closedAt!),
        cashierName,
        salesCount: session.salesCount ?? 0,
        totalRevenue: session.totalRevenue ?? 0,
        cashCollected: session.cashCollected ?? 0,
        mobileCollected: session.mobileCollected ?? 0,
        cardCollected: session.cardCollected ?? 0,
        otherCollected: session.otherCollected ?? 0,
        creditCollected: session.creditCollected ?? 0,
        variance: session.variance ?? 0,
        currency: user.business.currency,
      })
    : null;

  return (
    <SessionReportView
      eveningReportText={eveningReportText}
      data={{
        businessName: user.business.name,
        locationName: session.location.name,
        sessionNumber: session.number,
        cashierName,
        openedAt: new Date(session.openedAt),
        closedAt: new Date(session.closedAt!),
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
