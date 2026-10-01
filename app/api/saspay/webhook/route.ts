import { NextRequest, NextResponse } from "next/server";
import { verifySaspaySignature } from "@/lib/saspay-signature";
import { reconcileSaspayPayments } from "@/lib/saspay-payments";

/**
 * Confirmations (webhooks) SasPay. Adresse à déclarer dans SasPay : https://www.zindo.site/api/saspay/webhook
 * Chaque demande est signée (HMAC-SHA256) : une demande sans signature valide est refusée.
 * Les confirmations ne servent qu'à déclencher une vérification : le crédit d'un paiement se décide avec
 * getSaspayCheckoutStatus (lib/saspay.ts), jamais sur le seul contenu reçu ici. Les parcours (abonnement,
 * portefeuille du Marché, Pack Vérifié) se branchent ici un par un.
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const valid = verifySaspaySignature({
    rawBody,
    timestamp: request.headers.get("x-webhook-timestamp"),
    signature: request.headers.get("x-webhook-signature"),
    secret: process.env.SASPAY_WEBHOOK_SECRET,
  });
  if (!valid) return NextResponse.json({ error: "Signature invalide" }, { status: 401 });

  let event = "";
  try {
    event = String((JSON.parse(rawBody) as { event?: string }).event ?? "");
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }
  console.log("[saspay/webhook] reçu :", event);
  // La confirmation sert de déclencheur : on relit chez SasPay chaque paiement en attente, puis on active ce qui est payé.
  try {
    const confirmed = await reconcileSaspayPayments();
    return NextResponse.json({ received: true, confirmed });
  } catch (e) {
    console.error("[saspay/webhook] Traitement impossible :", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Traitement impossible" }, { status: 500 });
  }
}
