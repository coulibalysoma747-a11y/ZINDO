import "server-only";

/**
 * Client SasPay (https://docs.saspay.me/) : encaissement par page de paiement hébergée (Orange Money, Moov Money, carte).
 * Clés dans les variables d'environnement Vercel, jamais dans le code :
 *  - SASPAY_SECRET_KEY : clé secrète (sk_test_… pour essayer, sk_live_… en vrai) ;
 *  - SASPAY_WEBHOOK_SECRET : secret de signature des confirmations (voir app/api/saspay/webhook).
 */
const BASE_URL = "https://api.saspay.me/api/v1";

export function isSaspayConfigured(): boolean {
  return Boolean(process.env.SASPAY_SECRET_KEY);
}

function authHeaders(): Record<string, string> {
  const key = process.env.SASPAY_SECRET_KEY;
  if (!key) throw new Error("SASPAY_SECRET_KEY n'est pas configurée");
  return { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
}

export type SaspayCheckout = { id: string; slug: string; checkoutUrl: string; status: string };

/** Crée une session de paiement et renvoie l'adresse de la page SasPay où envoyer le client. */
export async function createSaspayCheckout(input: {
  amount: number;
  currency?: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  description?: string;
  returnUrl?: string;
  country?: string;
  /** Repères ZINDO (parcours, identifiant interne…), renvoyés par SasPay. */
  metadata?: Record<string, string | number>;
}): Promise<SaspayCheckout> {
  const res = await fetch(`${BASE_URL}/checkout-sessions/`, {
    method: "POST",
    headers: authHeaders(),
    cache: "no-store",
    body: JSON.stringify({
      amount: input.amount.toFixed(2),
      currency: input.currency ?? "XOF",
      customer_name: input.customerName,
      customer_email: input.customerEmail,
      ...(input.customerPhone ? { customer_phone: input.customerPhone } : {}),
      ...(input.description ? { description: input.description } : {}),
      ...(input.returnUrl ? { return_url: input.returnUrl } : {}),
      ...(input.country ? { country: input.country } : {}),
      ...(input.metadata ? { metadata: input.metadata } : {}),
    }),
  });
  if (!res.ok) {
    console.error("[saspay] Création du paiement refusée :", res.status, (await res.text()).slice(0, 300));
    throw new Error("Le paiement n'a pas pu être créé. Réessayez dans un instant.");
  }
  const data = (await res.json()) as { id: string; slug: string; checkout_url: string; status: string };
  return { id: data.id, slug: data.slug, checkoutUrl: data.checkout_url, status: data.status };
}

export type SaspayCheckoutStatus = {
  id: string;
  status: string;
  transactionId: string | null;
  transactionStatus: string | null;
  transactionReference: string | null;
  /** Vrai seulement quand SasPay a revérifié le paiement côté opérateur : seule source de vérité pour créditer. */
  paid: boolean;
};

/** Statut d'une session de paiement (SasPay revérifie l'état réel avant de répondre). */
export async function getSaspayCheckoutStatus(id: string): Promise<SaspayCheckoutStatus> {
  const res = await fetch(`${BASE_URL}/checkout-sessions/${encodeURIComponent(id)}/status/`, { headers: authHeaders(), cache: "no-store" });
  if (!res.ok) {
    console.error("[saspay] Lecture du statut refusée :", res.status);
    throw new Error("Statut du paiement indisponible");
  }
  const data = (await res.json()) as { id: string; status: string; transaction_id?: string | null; transaction_status?: string | null; transaction_reference?: string | null };
  return {
    id: data.id,
    status: data.status,
    transactionId: data.transaction_id ?? null,
    transactionStatus: data.transaction_status ?? null,
    transactionReference: data.transaction_reference ?? null,
    paid: data.status === "PAID",
  };
}
