import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyYiriwapaySignature } from "@/lib/yiriwapay-signature";
import { reconcileSaspayPayments } from "@/lib/saspay-payments";

/**
 * Notifications (webhooks) YiriwaPay. Adresse à déclarer dans l'onglet « Développeurs » de YiriwaPay :
 * https://www.zindo.site/api/yiriwapay/webhook
 * Chaque demande est signée (HMAC-SHA256) : une demande sans signature valide est refusée.
 * Les notifications ne servent qu'à déclencher une vérification : le crédit d'un paiement se décide avec
 * getYiriwapayPaymentStatus (lib/yiriwapay.ts), jamais sur le seul contenu reçu ici. Les parcours (abonnement,
 * portefeuille du Marché, Pack Vérifié) passent tous par reconcileSaspayPayments (les tables gardent l'ancien nom « saspay »).
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const valid = verifyYiriwapaySignature({
    rawBody,
    header: request.headers.get("yiriwapay-signature"),
    secret: process.env.YIRIWAPAY_WEBHOOK_SECRET,
  });
  if (!valid) return NextResponse.json({ error: "Signature invalide" }, { status: 401 });

  let type = "";
  let paymentId = "";
  try {
    const event = JSON.parse(rawBody) as { type?: string; data?: { object?: { id?: string } } };
    type = String(event.type ?? "");
    paymentId = String(event.data?.object?.id ?? "");
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }
  console.log("[yiriwapay/webhook] reçu :", type);

  try {
    // Un paiement expiré peut, rarement, être confirmé plus tard par l'opérateur : on le remet en attente,
    // puis la relecture chez YiriwaPay décide s'il est vraiment payé.
    if (type === "payment.succeeded" && paymentId) {
      await supabase.from("saspay_payments").update({ status: "PENDING" }).eq("saspay_id", paymentId).eq("status", "FAILED");
    }
    const confirmed = await reconcileSaspayPayments();
    return NextResponse.json({ received: true, confirmed });
  } catch (e) {
    console.error("[yiriwapay/webhook] Traitement impossible :", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Traitement impossible" }, { status: 500 });
  }
}
