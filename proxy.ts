import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/session";
import { verifyAdminSessionToken, ADMIN_SESSION_COOKIE_NAME } from "@/lib/adminSession";

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/inscription",
  "/inscription-google",
  "/mot-de-passe-oublie",
  "/verifier",
  "/compte-suspendu",
  "/maintenance",
  "/boutique",
  "/cgu",
  "/confidentialite",
  "/tarifs",
  // Version anglaise (voir app/en/) : "/en" couvre aussi tous ses
  // sous-chemins (/en/login, /en/inscription, /en/cgu, /en/confidentialite)
  // grâce au startsWith(`${p}/`) ci-dessous — pas besoin de les lister un par un.
  "/en",
];
// Chemins publics qui restent accessibles même à un utilisateur déjà connecté
// (au lieu d'être redirigés vers /dashboard).
const PUBLIC_PATHS_ALLOWED_WHEN_LOGGED_IN = [
  "/mot-de-passe-oublie",
  "/verifier",
  "/compte-suspendu",
  "/maintenance",
  "/boutique",
  "/cgu",
  "/confidentialite",
  "/en/cgu",
  "/en/confidentialite",
];

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

  // Transmis au layout racine (app/layout.tsx) via `headers()` pour poser le
  // bon attribut `lang` sur <html> — la version anglaise (app/en/) vit sous
  // le même layout racine que le reste de l'app, qui ne peut pas redéclarer
  // <html> par route.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-zindo-locale", pathname === "/en" || pathname.startsWith("/en/") ? "en" : "fr");
  // Transmis à app/(app)/layout.tsx pour savoir si la route courante est
  // /abonnement — seule page autorisée quand l'accès est bloqué (essai
  // expiré/impayé), pour éviter une boucle de redirection sur elle-même.
  requestHeaders.set("x-zindo-pathname", pathname);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    // robots.txt et sitemap.xml doivent rester accessibles sans session, sans
    // quoi les robots d'indexation (Google...) se font rediriger vers /login
    // et reçoivent une page de connexion HTML à la place — empêchant ZINDO
    // d'être indexé du tout, quel que soit le contenu réel de ces fichiers.
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|robots.txt|sitemap.xml|sw.js|icons/|.*\\.(?:svg|png|jpg|jpeg|webp)$).*)",
  ],
};
