import "server-only";

/**
 * Client SasPay (https://docs.saspay.me/) : encaissement par page de paiement hébergée (Orange Money, Moov Money et carte, côté SasPay).
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
    const errorText = await res.text();
    console.error("[saspay] Création du paiement refusée :", res.status, errorText.slice(0, 300));
    throw new Error("Le paiement n'a pas pu être créé. Réessayez dans un instant.");
  }

  const raw = await res.json();
  const item = (raw && typeof raw === "object" && "data" in raw && raw.data ? raw.data : raw) as Record<string, any>;

  const id = String(item.id || raw.id || "");
  const slug = String(item.slug || raw.slug || "");
  const checkoutUrl = String(item.checkout_url || item.checkoutUrl || raw.checkout_url || raw.checkoutUrl || "");
  const status = String(item.status || raw.status || "PENDING");

  return { id, slug, checkoutUrl, status };
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

  const raw = await res.json();
  const item = (raw && typeof raw === "object" && "data" in raw && raw.data ? raw.data : raw) as Record<string, any>;

  const status = String(item.status || raw.status || "");
  return {
    id: String(item.id || raw.id || id),
    status,
    transactionId: (item.transaction_id ?? raw.transaction_id ?? null) as string | null,
    transactionStatus: (item.transaction_status ?? raw.transaction_status ?? null) as string | null,
    transactionReference: (item.transaction_reference ?? raw.transaction_reference ?? null) as string | null,
    paid: status === "PAID",
  };
}
