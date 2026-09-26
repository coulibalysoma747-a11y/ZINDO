import { NextResponse, type NextRequest } from "next/server";
import { destroySession } from "@/lib/session";

/**
 * Session devenue inutilisable (compte supprimé ou désactivé, base
 * injoignable) alors que le cookie reste bien signé : sans ce passage, le
 * proxy renvoyait /login vers /dashboard, qui renvoyait vers /login, et le
 * navigateur finissait sur ERR_TOO_MANY_REDIRECTS. On efface le cookie avant
 * d'afficher la page de connexion.
 */
export async function GET(request: NextRequest) {
  await destroySession();
  return NextResponse.redirect(new URL("/login", request.url));
}
