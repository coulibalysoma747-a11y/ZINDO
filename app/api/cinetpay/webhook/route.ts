import { NextResponse, type NextRequest } from "next/server";
import { verifyCinetPayTransaction, isCinetPayConfigured } from "@/lib/cinetpay";
import { activateInvoicePayment } from "@/lib/subscription-fulfillment";

// Webhook CinetPay ("notify_url") — appelé par CinetPay après un paiement.
// Reste inerte tant que CINETPAY_API_KEY n'est pas configuré ; à enregistrer
// comme URL de notification dans le tableau de bord CinetPay une fois le
// compte marchand créé : https://votre-domaine/api/cinetpay/webhook
export async function POST(request: NextRequest) {
  if (!isCinetPayConfigured()) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const formData = await request.formData().catch(() => null);
  const transactionId = formData?.get("cpm_trans_id")?.toString();
  if (!transactionId) {
    return NextResponse.json({ error: "missing_transaction_id" }, { status: 400 });
  }

  const { paid } = await verifyCinetPayTransaction(transactionId);
  if (!paid) {
    return NextResponse.json({ status: "not_paid" });
  }

  const result = await activateInvoicePayment({
    invoiceId: transactionId,
    method: "CINETPAY",
    reference: transactionId,
  });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ status: "ok" });
}
