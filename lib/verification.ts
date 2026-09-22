import "server-only";
import { headers } from "next/headers";

/** URL absolue de vérification publique d'un ticket, à partir de l'hôte de la requête en cours. */
export async function getVerificationUrl(saleId: string) {
  const headerList = await headers();
  const host = headerList.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";
  return `${protocol}://${host}/verifier/${saleId}`;
}

/**
 * URL absolue de vérification publique d'une ordonnance (QR code imprimé
 * dessus) — permet à un pharmacien de confirmer, sans compte ZINDO, qu'une
 * ordonnance a bien été émise par ce cabinet et que la liste des produits
 * n'a pas été modifiée après impression. Voir app/verifier-ordonnance/[id].
 */
export async function getOrdonnanceVerificationUrl(consultationId: string) {
  const headerList = await headers();
  const host = headerList.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";
  return `${protocol}://${host}/verifier-ordonnance/${consultationId}`;
}
