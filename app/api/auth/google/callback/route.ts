import { NextResponse, type NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { createSession } from "@/lib/session";
import { exchangeGoogleCode, fetchGoogleUserInfo } from "@/lib/google-auth";

const STATE_COOKIE = "google_oauth_state";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const errorParam = searchParams.get("error");
  const cookieState = request.cookies.get(STATE_COOKIE)?.value;

  if (errorParam || !code || !state || !cookieState || state !== cookieState) {
    const response = NextResponse.redirect(new URL("/login?error=google-echec", request.url));
    response.cookies.delete(STATE_COOKIE);
    return response;
  }

  try {
    const redirectUri = new URL("/api/auth/google/callback", request.url).toString();
    const tokens = await exchangeGoogleCode(code, redirectUri);
    const profile = await fetchGoogleUserInfo(tokens.access_token);

    if (!profile.email || !profile.email_verified) {
      return redirectWithClearedState(request, "/login?error=google-email-non-verifie");
    }

    const { data: user, error } = await supabase
      .from("users")
      .select(
        "id, businessId:business_id, role, active, business:businesses(suspended)"
      )
      .eq("email", profile.email)
      .maybeSingle();

    if (error) {
      console.error("[googleCallback] Échec de la requête Supabase :", error.message);
      return redirectWithClearedState(request, "/login?error=google-echec");
    }
    if (!user) {
      return redirectWithClearedState(request, "/login?error=google-aucun-compte");
    }
    if (!user.active) {
      return redirectWithClearedState(request, "/login?error=google-compte-desactive");
    }
    if ((user.business as unknown as { suspended: boolean } | null)?.suspended) {
      return redirectWithClearedState(request, "/compte-suspendu");
    }

    await createSession({
      userId: user.id as string,
      businessId: user.businessId as string,
      role: user.role as string,
    });
    return redirectWithClearedState(request, "/dashboard");
  } catch {
    return redirectWithClearedState(request, "/login?error=google-echec");
  }
}

function redirectWithClearedState(request: NextRequest, path: string) {
  const response = NextResponse.redirect(new URL(path, request.url));
  response.cookies.delete(STATE_COOKIE);
  return response;
}
