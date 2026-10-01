import { createHmac, timingSafeEqual } from "node:crypto";

/** Tolérance sur l'horodatage d'une confirmation SasPay (documentation : 5 minutes). */
const MAX_AGE_SECONDS = 300;

/**
 * Vérifie une confirmation (webhook) SasPay : HMAC-SHA256 de « horodatage.corps » avec le secret de signature,
 * comparé en temps constant, et horodatage récent (rejeu impossible au-delà de 5 minutes).
 */
export function verifySaspaySignature(params: { rawBody: string; timestamp: string | null; signature: string | null; secret: string | undefined; nowSeconds?: number }): boolean {
  const { rawBody, timestamp, signature, secret } = params;
  if (!secret || !timestamp || !signature) return false;
  const ts = Number(timestamp);
  const now = params.nowSeconds ?? Date.now() / 1000;
  if (!Number.isFinite(ts) || Math.abs(now - ts) > MAX_AGE_SECONDS) return false;
  const expected = Buffer.from(createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex"));
  const received = Buffer.from(signature.trim().toLowerCase());
  return expected.length === received.length && timingSafeEqual(expected, received);
}
