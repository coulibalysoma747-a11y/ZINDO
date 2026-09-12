import { randomBytes } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { isGoogleAuthConfigured, getGoogleAuthUrl } from "@/lib/google-auth";

const STATE_COOKIE = "google_oauth_state";

export async function GET(request: NextRequest) {
  if (!isGoogleAuthConfigured()) {
    return NextResponse.redirect(new URL("/login?error=google-non-configure", request.url));
  }

  const state = randomBytes(16).toString("hex");
  const redirectUri = new URL("/api/auth/google/callback", request.url).toString();

  const response = NextResponse.redirect(getGoogleAuthUrl(state, redirectUri));
  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return response;
}
