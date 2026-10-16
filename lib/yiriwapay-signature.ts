import { createHmac, timingSafeEqual } from "node:crypto";

/** Tolérance sur l'horodatage d'une notification YiriwaPay (documentation : 5 minutes). */
const MAX_AGE_SECONDS = 300;

/**
 * Vérifie une notification (webhook) YiriwaPay. L'en-tête `YiriwaPay-Signature` a la forme « t=horodatage,v1=signature » ;
 * la signature est le HMAC-SHA256 de « horodatage.corps » avec le secret whsec_…, comparée en temps constant,
 * et l'horodatage doit être récent (pas de rejeu au-delà de 5 minutes).
 */
export function verifyYiriwapaySignature(params: { rawBody: string; header: string | null; secret: string | undefined; nowSeconds?: number }): boolean {
  const { rawBody, header, secret } = params;
  if (!secret || !header) return false;

  const parts: Record<string, string> = {};
  for (const part of header.split(",")) {
    const index = part.indexOf("=");
    if (index > 0) parts[part.slice(0, index).trim()] = part.slice(index + 1).trim();
  }

  const ts = Number(parts.t);
  const now = params.nowSeconds ?? Date.now() / 1000;
  if (!Number.isFinite(ts) || ts <= 0 || Math.abs(now - ts) > MAX_AGE_SECONDS) return false;

  const expected = Buffer.from(createHmac("sha256", secret).update(`${parts.t}.${rawBody}`).digest("hex"));
  const received = Buffer.from((parts.v1 ?? "").toLowerCase());
  return expected.length === received.length && timingSafeEqual(expected, received);
}
