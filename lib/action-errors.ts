import "server-only";

/**
 * redirect()/notFound() de Next.js fonctionnent en interne en levant une
 * erreur spéciale (portant un `.digest` préfixé "NEXT_REDIRECT"/"NEXT_NOT_FOUND"/
 * "NEXT_HTTP_ERROR_FALLBACK") que le framework intercepte lui-même plus haut
 * dans l'arbre. Un try/catch générique autour d'une Server Action (voir les
 * "filets de sécurité" dans lib/actions/sales.ts, purchases.ts, transfers.ts,
 * inventory.ts) avalerait cette erreur par erreur et casserait la navigation
 * (ex. redirection vers /login) — il faut donc la relancer telle quelle avant
 * de traiter le reste comme une vraie erreur inattendue.
 */
export function rethrowIfNavigationSignal(error: unknown): void {
  const digest = (error as { digest?: unknown })?.digest;
  if (
    typeof digest === "string" &&
    (digest.startsWith("NEXT_REDIRECT") || digest === "NEXT_NOT_FOUND" || digest.startsWith("NEXT_HTTP_ERROR_FALLBACK"))
  ) {
    throw error;
  }
}
