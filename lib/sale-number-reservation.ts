import "server-only";
import { createHmac, timingSafeEqual } from "crypto";

/**
 * Numéro de vente réservé d'avance par la caisse (voir
 * lib/actions/sales.ts::reserveSaleNumberAction) : le ticket imprimé à la
 * validation instantanée porte ainsi tout de suite son vrai numéro, sans
 * attendre le serveur. Signé pour qu'un client ne puisse pas imposer un
 * numéro que la séquence du commerce n'a jamais attribué (collision future
 * avec generateSaleNumber).
 */
function signature(businessId: string, number: string) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET manquant");
  return createHmac("sha256", secret).update(`sale-number:${businessId}:${number}`).digest("base64url");
}

export function signReservedSaleNumber(businessId: string, number: string) {
  return signature(businessId, number);
}

export function isValidReservedSaleNumber(businessId: string, number: string, token: string) {
  try {
    const expected = Buffer.from(signature(businessId, number));
    const received = Buffer.from(token);
    return expected.length === received.length && timingSafeEqual(expected, received);
  } catch {
    return false;
  }
}
