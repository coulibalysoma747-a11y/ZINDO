import "server-only";

// Intégration CinetPay (passerelle supportant Orange Money, Moov Money, Wave
// et carte bancaire au Burkina Faso). Reste inactive tant que les variables
// d'environnement ne sont pas configurées — dans ce cas, seul le paiement
// manuel (Mobile Money + référence à confirmer) est proposé au commerçant.
// Une fois le compte marchand créé, ajouter CINETPAY_API_KEY, CINETPAY_SITE_ID
// et CINETPAY_SECRET_KEY à .env : aucune autre modification de code requise.

export function isCinetPayConfigured() {
  return Boolean(process.env.CINETPAY_API_KEY && process.env.CINETPAY_SITE_ID);
}

export async function initiateCinetPayPayment(params: {
  invoiceId: string;
  amount: number;
  description: string;
  customerName: string;
  customerPhone: string;
  returnUrl: string;
  notifyUrl: string;
}): Promise<{ paymentUrl: string } | { error: string }> {
  if (!isCinetPayConfigured()) {
    return { error: "Le paiement automatique n'est pas encore configuré. Utilisez le paiement manuel ci-dessous." };
  }

  const res = await fetch("https://api-checkout.cinetpay.com/v2/payment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      apikey: process.env.CINETPAY_API_KEY,
      site_id: process.env.CINETPAY_SITE_ID,
      transaction_id: params.invoiceId,
      amount: params.amount,
      currency: "XOF",
      description: params.description,
      customer_name: params.customerName,
      customer_phone_number: params.customerPhone,
      return_url: params.returnUrl,
      notify_url: params.notifyUrl,
      channels: "ALL",
    }),
  });

  const json = await res.json();
  if (json.code !== "201" || !json.data?.payment_url) {
    return { error: json.message ?? "Échec de l'initialisation du paiement CinetPay" };
  }
  return { paymentUrl: json.data.payment_url as string };
}

export async function verifyCinetPayTransaction(transactionId: string): Promise<{ paid: boolean }> {
  if (!isCinetPayConfigured()) return { paid: false };

  const res = await fetch("https://api-checkout.cinetpay.com/v2/payment/check", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      apikey: process.env.CINETPAY_API_KEY,
      site_id: process.env.CINETPAY_SITE_ID,
      transaction_id: transactionId,
    }),
  });
  const json = await res.json();
  return { paid: json.data?.status === "ACCEPTED" };
}
