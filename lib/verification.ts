import "server-only";
import { headers } from "next/headers";
import { isDesktopBuild } from "@/lib/offline/auth-cache";

/** Domaine public utilisé pour les QR codes de vérification depuis l'application Windows — voir getPublicVerificationHost. */
const DESKTOP_PUBLIC_HOST = "www.zindo.site";

/**
 * Hôte à utiliser pour les liens de vérification imprimés sur un ticket ou
 * une ordonnance. Sur le déploiement web, l'hôte de la requête en cours
 * convient (c'est déjà un domaine public). Mais l'application Windows sert
 * ces pages depuis un serveur Next.js local (127.0.0.1, port choisi au
 * hasard à chaque lancement, voir electron/main.ts) : un QR code encodant
 * cette adresse ne serait joignable ni depuis le téléphone d'un client, ni
 * après redémarrage de l'application. On force donc le domaine public ZINDO
 * dans ce cas, seule option pour qu'un tiers externe puisse vérifier le
 * ticket.
 */
async function getPublicVerificationHost() {
  if (isDesktopBuild()) {
    return { host: DESKTOP_PUBLIC_HOST, protocol: "https" };
  }
  const headerList = await headers();
  const host = headerList.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";
  return { host, protocol };
}

/** URL absolue de vérification publique d'un ticket, à partir de l'hôte de la requête en cours. */
export async function getVerificationUrl(saleId: string) {
  const { host, protocol } = await getPublicVerificationHost();
  return `${protocol}://${host}/verifier/${saleId}`;
}

/**
 * URL absolue de vérification publique d'une ordonnance (QR code imprimé
 * dessus) — permet à un pharmacien de confirmer, sans compte ZINDO, qu'une
 * ordonnance a bien été émise par ce cabinet et que la liste des produits
 * n'a pas été modifiée après impression. Voir app/verifier-ordonnance/[id].
 */
export async function getOrdonnanceVerificationUrl(consultationId: string) {
  const { host, protocol } = await getPublicVerificationHost();
  return `${protocol}://${host}/verifier-ordonnance/${consultationId}`;
}
