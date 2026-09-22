import { notFound, redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { getConsultationReceiptAction } from "@/lib/actions/consultations";
import { MEDICAL_ACTIVITY_KEY } from "@/lib/nav";
import type { ReceiptData, ReceiptWidth } from "@/components/sales/Receipt";
import { ConsultationReceiptView } from "./ConsultationReceiptView";

export default async function ConsultationReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePermission(PERMISSIONS.CONSULTATIONS_MANAGE);
  if (user.business.activityKey !== MEDICAL_ACTIVITY_KEY) redirect("/dashboard");

  const receipt = await getConsultationReceiptAction(id);
  if ("error" in receipt) notFound();

  const business = user.business;
  const data: ReceiptData = {
    businessName: business.name,
    businessPhone: business.phone,
    businessAddress: business.address,
    logoUrl: business.logoUrl,
    ticketNumber: receipt.ticketNumber,
    date: new Date(receipt.date),
    cashierName: receipt.cashierName,
    customerName: receipt.patientName ?? undefined,
    items: [{ name: receipt.itemName, quantity: 1, unitPrice: receipt.fee, total: receipt.fee }],
    subtotal: receipt.fee,
    total: receipt.fee,
    paymentMethodLabel: "Espèces",
    amountPaid: receipt.fee,
    footerMessage: business.ticketFooter,
    currency: business.currency,
  };

  return <ConsultationReceiptView data={data} defaultWidth={(user.printerTicketWidth ?? business.ticketWidth) as ReceiptWidth} />;
}
