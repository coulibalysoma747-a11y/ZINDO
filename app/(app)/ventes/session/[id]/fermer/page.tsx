import { notFound, redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { computeSessionStats } from "@/lib/cash-sessions";
import { CloseSessionForm } from "./CloseSessionForm";

type SessionRow = {
  id: string;
  number: string;
  status: string;
  businessId: string;
  locationId: string;
  openingAmount: number;
  openedAt: string;
  location: { name: string };
  user: { firstName: string; lastName: string };
};

export default async function CloseSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePermission(PERMISSIONS.CASH_SESSIONS_MANAGE);
  const { id } = await params;

  const { data } = await supabase
    .from("cash_sessions")
    .select(
      "id, number, status, businessId:business_id, locationId:location_id, openingAmount:opening_amount, openedAt:opened_at, location:locations(name), user:users(firstName:first_name, lastName:last_name)"
    )
    .eq("id", id)
    .eq("business_id", user.businessId)
    .maybeSingle();
  if (!data) notFound();
  const session = data as unknown as SessionRow;
  if (session.status === "FERMEE") redirect(`/ventes/session/${session.id}`);

  const stats = await computeSessionStats({
    businessId: session.businessId,
    locationId: session.locationId,
    sessionId: session.id,
    openingAmount: session.openingAmount,
    openedAt: new Date(session.openedAt),
    closedAt: null,
  });

  return (
    <CloseSessionForm
      sessionId={session.id}
      sessionNumber={session.number}
      locationName={session.location.name}
      cashierName={`${session.user.firstName} ${session.user.lastName}`}
      openedAt={new Date(session.openedAt).toISOString()}
      openingAmount={session.openingAmount}
      currency={user.business.currency}
      stats={stats}
    />
  );
}
