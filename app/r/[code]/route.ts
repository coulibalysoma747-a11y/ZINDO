import { NextResponse, type NextRequest } from "next/server";
import { normalizeReferralCode, REFERRAL_COOKIE, REFERRAL_SOURCES } from "@/lib/referral";

/**
 * Lien de parrainage (QR code "Créé avec ZINDO", partage WhatsApp) :
 * zindo.site/r/CODE?s=source. Mémorise le code et sa source dans un cookie
 * (60 jours), puis envoie vers l'inscription avec le code prérempli — le
 * rattachement au parrain se fait à la création du compte (lib/referral.ts).
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code: rawCode } = await params;
  const code = normalizeReferralCode(rawCode);
  const target = new URL("/inscription", request.url);
  if (!code) return NextResponse.redirect(target);

  const rawSource = request.nextUrl.searchParams.get("s") ?? "lien";
  const source = REFERRAL_SOURCES[rawSource] ? rawSource : "lien";
  target.searchParams.set("ref", code);

  const response = NextResponse.redirect(target);
  response.cookies.set(REFERRAL_COOKIE, `${code}:${source}`, {
    maxAge: 60 * 24 * 60 * 60,
    path: "/",
    sameSite: "lax",
    httpOnly: true,
  });
  return response;
}
