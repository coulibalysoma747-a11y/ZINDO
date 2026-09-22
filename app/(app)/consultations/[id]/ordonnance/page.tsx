import { notFound, redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { getConsultationOrdonnanceAction } from "@/lib/actions/consultations";
import { MEDICAL_ACTIVITY_KEY } from "@/lib/nav";
import { OrdonnanceView } from "./OrdonnanceView";

export default async function ConsultationOrdonnancePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePermission(PERMISSIONS.CONSULTATIONS_MANAGE);
  if (user.business.activityKey !== MEDICAL_ACTIVITY_KEY) redirect("/dashboard");

  const ordonnance = await getConsultationOrdonnanceAction(id);
  if ("error" in ordonnance) notFound();

  const business = user.business;
  return (
    <OrdonnanceView
      data={{
        ...ordonnance,
        businessName: business.name,
        businessPhone: business.phone,
        businessAddress: business.address,
        logoUrl: business.logoUrl,
      }}
    />
  );
}
