import "server-only";

/**
 * Client YiriwaPay (https://yiriwapay-app.vercel.app/developpeurs) : encaissement Mobile Money par page de paiement
 * hébergée (Orange Money, Moov Money, MTN MoMo, Wave, Free Money).
 * Clés dans les variables d'environnement, jamais dans le code :
 *  - YIRIWAPAY_SECRET_KEY : clé secrète (sk_test_… pour essayer, sk_live_… en vrai) ;
 *  - YIRIWAPAY_WEBHOOK_SECRET : secret de signature des notifications (whsec_…, voir app/api/yiriwapay/webhook).
 * Les montants sont des entiers en F CFA (de 200 à 1 000 000).
 */
const BASE_URL = "https://yiriwapay-app.vercel.app/api/v1";

export function isYiriwapayConfigured(): boolean {
  return Boolean(process.env.YIRIWAPAY_SECRET_KEY);
}

function authHeaders(): Record<string, string> {
  const key = process.env.YIRIWAPAY_SECRET_KEY;
  if (!key) throw new Error("YIRIWAPAY_SECRET_KEY n'est pas configurée");
  return { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
}

export type YiriwapayCheckout = { id: string; checkoutUrl: string; status: string };

/** Crée un paiement et renvoie l'adresse de la page YiriwaPay où envoyer le client. */
export async function createYiriwapayCheckout(input: {
  amount: number;
  /** Numéro unique de cette tentative (100 caractères au plus) : sert aussi de clé d'idempotence. */
  reference: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  description?: string;
  returnUrl?: string;
  /** Repères ZINDO (parcours, identifiant interne…), renvoyés dans les notifications. */
  metadata?: Record<string, string | number>;
}): Promise<YiriwapayCheckout> {
  const customer = {
    name: input.customerName,
    ...(input.customerEmail ? { email: input.customerEmail } : {}),
    ...(input.customerPhone ? { phone: input.customerPhone } : {}),
  };
  const res = await fetch(`${BASE_URL}/payments`, {
    method: "POST",
    headers: { ...authHeaders(), "Idempotency-Key": input.reference },
    cache: "no-store",
    body: JSON.stringify({
      amount: Math.round(input.amount),
      reference: input.reference,
      customer,
      ...(input.description ? { description: input.description } : {}),
      ...(input.returnUrl ? { success_url: input.returnUrl, cancel_url: input.returnUrl } : {}),
      ...(input.metadata ? { metadata: Object.fromEntries(Object.entries(input.metadata).map(([k, v]) => [k, String(v)])) } : {}),
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("[yiriwapay] Création du paiement refusée :", res.status, errorText.slice(0, 300));
    // Les erreurs de saisie (422, par exemple un montant trop bas) sont rédigées en français : on les montre telles quelles.
    if (res.status === 422) {
      let message: string | undefined;
      try {
        message = (JSON.parse(errorText) as { error?: { message?: string } }).error?.message;
      } catch {
        // Réponse non JSON : message générique ci-dessous.
      }
      if (message) throw new Error(message);
    }
    throw new Error("Le paiement n'a pas pu être créé. Réessayez dans un instant.");
  }

  const raw = (await res.json()) as Record<string, unknown>;
  return {
    id: String(raw.id ?? ""),
    checkoutUrl: String(raw.checkout_url ?? ""),
    status: String(raw.status ?? "created"),
  };
}

export type YiriwapayPaymentStatus = {
  id: string;
  /** created, pending, succeeded, failed, expired ou cancelled. */
  status: string;
  /** Montant du paiement en F CFA : à comparer avec la commande avant de créditer. */
  amount: number | null;
  reference: string | null;
  /** Vrai seulement pour « succeeded » : seule source de vérité pour créditer. */
  paid: boolean;
};

/** Lit un paiement chez YiriwaPay (source de vérité, jamais le contenu d'une notification). */
export async function getYiriwapayPaymentStatus(id: string): Promise<YiriwapayPaymentStatus> {
  const res = await fetch(`${BASE_URL}/payments/${encodeURIComponent(id)}`, { headers: authHeaders(), cache: "no-store" });
  if (!res.ok) {
    console.error("[yiriwapay] Lecture du paiement refusée :", res.status);
    throw new Error("Statut du paiement indisponible");
  }

  const raw = (await res.json()) as Record<string, unknown>;
  const status = String(raw.status ?? "");
  const amount = Number(raw.amount);
  return {
    id: String(raw.id ?? id),
    status,
    amount: Number.isFinite(amount) ? amount : null,
    reference: raw.reference == null ? null : String(raw.reference),
    paid: status === "succeeded",
  };
}
