import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/session";
import { verifyAdminSessionToken, ADMIN_SESSION_COOKIE_NAME } from "@/lib/adminSession";

const PUBLIC_PATHS = ["/", "/login", "/inscription", "/mot-de-passe-oublie", "/verifier", "/compte-suspendu", "/boutique"];
// Chemins publics qui restent accessibles même à un utilisateur déjà connecté
// (au lieu d'être redirigés vers /dashboard).
const PUBLIC_PATHS_ALLOWED_WHEN_LOGGED_IN = ["/mot-de-passe-oublie", "/verifier", "/compte-suspendu", "/boutique"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // La console /admin (super-admin propriétaire de la plateforme) a son propre
  // système de session, totalement indépendant de celui des commerçants : elle
  // est gérée ici séparément et ne doit jamais retomber dans la logique
  // tenant ci-dessous.
  if (pathname === "/admin/login" || pathname.startsWith("/admin/login/")) {
    const adminToken = request.cookies.get(ADMIN_SESSION_COOKIE_NAME)?.value;
    const adminSession = adminToken ? await verifyAdminSessionToken(adminToken) : null;
    if (adminSession) return NextResponse.redirect(new URL("/admin", request.url));
    return NextResponse.next();
  }
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const adminToken = request.cookies.get(ADMIN_SESSION_COOKIE_NAME)?.value;
    const adminSession = adminToken ? await verifyAdminSessionToken(adminToken) : null;
    if (!adminSession) return NextResponse.redirect(new URL("/admin/login", request.url));
    return NextResponse.next();
  }

  const isPublic =
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`)) ||
    pathname.startsWith("/api/public") ||
    pathname.startsWith("/api/auth/google") ||
    pathname.startsWith("/api/cinetpay");

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (!isPublic && !session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const allowedWhenLoggedIn =
    PUBLIC_PATHS_ALLOWED_WHEN_LOGGED_IN.some((p) => pathname === p || pathname.startsWith(`${p}/`)) ||
    pathname.startsWith("/api/auth/google");
  if (isPublic && session && !allowedWhenLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp)$).*)"],
};
