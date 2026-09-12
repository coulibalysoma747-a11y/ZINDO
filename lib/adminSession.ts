import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

// Session totalement séparée de lib/session.ts (cookie, secret et payload
// distincts) : la console administrateur de la plateforme ne doit jamais
// partager d'état avec les sessions des comptes commerçants.
const ADMIN_SESSION_COOKIE = "zindo_admin_session";
const ADMIN_SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7; // 7 jours

function getSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error("ADMIN_SESSION_SECRET manquant dans l'environnement");
  return new TextEncoder().encode(secret);
}

export type AdminSessionPayload = {
  adminId: string;
};

export async function createAdminSession(payload: AdminSessionPayload) {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ADMIN_SESSION_DURATION_SECONDS}s`)
    .sign(getSecret());

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_SESSION_DURATION_SECONDS,
  });
}

export async function destroyAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE);
}

export async function getAdminSession(): Promise<AdminSessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as AdminSessionPayload;
  } catch {
    return null;
  }
}

export async function verifyAdminSessionToken(token: string): Promise<AdminSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as AdminSessionPayload;
  } catch {
    return null;
  }
}

export const ADMIN_SESSION_COOKIE_NAME = ADMIN_SESSION_COOKIE;
