import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { isClientDocumentsEnabled, loadPaymentReceipt } from "@/lib/client-documents";
import { isZindoMentionEnabled } from "@/lib/zindo-mention";
import type { ReceiptWidth } from "@/components/sales/Receipt";
import { PaymentReceiptView } from "./PaymentReceiptView";

/** Reçu d'un remboursement client (flag « documents_client_pdf »). */
export default async function PaymentReceiptPage({ params }: { params: Promise<{ id: string; paymentId: string }> }) {
  const user = await requirePermission(PERMISSIONS.CUSTOMERS_VIEW);
  if (!(await isClientDocumentsEnabled(user.businessId))) notFound();

  const { id, paymentId } = await params;
  const [data, zindoMention] = await Promise.all([
    loadPaymentReceipt(id, paymentId, user.businessId),
    isZindoMentionEnabled(user.businessId),
  ]);
  if (!data) notFound();

  return (
    <PaymentReceiptView
      data={data}
      defaultWidth={(user.printerTicketWidth ?? user.business.ticketWidth) as ReceiptWidth}
      customerId={id}
      zindoMention={zindoMention}
    />
  );
}
