import "server-only";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { cookies, headers } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { supabase } from "@/lib/supabase";
import { isFeatureEnabled, registerFeatureFlag } from "@/lib/feature-flags";

/**
 * Connexion rapide : code PIN (4 chiffres) et Face ID / empreinte (clés d'accès
 * WebAuthn). Désactivée par défaut (flag), activable commerce par commerce.
 *
 * - Le PIN ne fonctionne que sur un appareil « de confiance » : l'employé l'y active
 *   une fois connecté (jeton secret dans un cookie, seule son empreinte est en base).
 * - Après 5 PIN faux, le PIN est bloqué 15 minutes (comme le mot de passe).
 * - Un compte avec la double authentification (2FA) ne peut pas utiliser le PIN.
 * - Les clés d'accès ne transmettent jamais de visage ni d'empreinte : l'appareil les
 *   vérifie lui-même et ne renvoie qu'une signature.
 */

export const QUICK_LOGIN_FLAG = "connexion_rapide";
export const MAX_PIN_ATTEMPTS = 5;
export const PIN_LOCK_MINUTES = 15;

const DEVICE_COOKIE = "zindo_device";
const PASSKEY_HINT_COOKIE = "zindo_passkey";
const CHALLENGE_COOKIE = "zindo_webauthn";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;
const CHALLENGE_SECONDS = 60 * 5;

export async function ensureQuickLoginFlagRegistered() {
  await registerFeatureFlag(
    QUICK_LOGIN_FLAG,
    "Connexion rapide (PIN et Face ID)",
    "Permet à chaque employé de se connecter avec un code PIN à 4 chiffres (sur un appareil de confiance) ou avec Face ID, l'empreinte ou Windows Hello (clé d'accès). Réglages dans Mon profil ; boutons sur la page de connexion. À activer commerce par commerce."
  );
}

export async function isQuickLoginEnabled(businessId: string): Promise<boolean> {
  await ensureQuickLoginFlagRegistered();
  return isFeatureEnabled(QUICK_LOGIN_FLAG, businessId);
}

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function sessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET manquant dans l'environnement");
  return new TextEncoder().encode(secret);
}

function cookieOptions(maxAge: number) {
  return { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge };
}

// --------------------------------------------------------------------------
// Appareils de confiance (PIN)
// --------------------------------------------------------------------------

async function readDeviceToken(): Promise<string | null> {
  return (await cookies()).get(DEVICE_COOKIE)?.value ?? null;
}

async function ensureDeviceToken(): Promise<string> {
  const existing = await readDeviceToken();
  if (existing) return existing;
  const token = crypto.randomBytes(32).toString("base64url");
  (await cookies()).set(DEVICE_COOKIE, token, cookieOptions(ONE_YEAR_SECONDS));
  return token;
}

export async function trustThisDevice(userId: string): Promise<boolean> {
  const token = await ensureDeviceToken();
  const { error } = await supabase
    .from("trusted_devices")
    .upsert({ user_id: userId, token_hash: sha256(token) }, { onConflict: "token_hash,user_id" });
  if (error) console.error("[trustThisDevice] Échec :", error.message);
  return !error;
}

export async function isThisDeviceTrusted(userId: string): Promise<boolean> {
  const token = await readDeviceToken();
  if (!token) return false;
  const { data } = await supabase
    .from("trusted_devices")
    .select("id")
    .eq("token_hash", sha256(token))
    .eq("user_id", userId)
    .maybeSingle();
  return Boolean(data);
}

export async function untrustThisDevice(userId: string) {
  const token = await readDeviceToken();
  if (!token) return;
  await supabase.from("trusted_devices").delete().eq("token_hash", sha256(token)).eq("user_id", userId);
}

export type QuickUser = { id: string; name: string };

/** Employés qui ont un PIN actif sur cet appareil (affichés sur la page de connexion). */
export async function listPinUsersOnThisDevice(): Promise<QuickUser[]> {
  const token = await readDeviceToken();
  if (!token) return [];
  const { data: rows, error } = await supabase
    .from("trusted_devices")
    .select("userId:user_id")
    .eq("token_hash", sha256(token));
  if (error || !rows || rows.length === 0) return [];
  const { data: users } = await supabase
    .from("users")
    .select("id, firstName:first_name, lastName:last_name, businessId:business_id")
    .in("id", rows.map((r) => r.userId as string))
    .eq("active", true)
    .not("pin_hash", "is", null);
  const result: QuickUser[] = [];
  for (const u of users ?? []) {
    if (!(await isQuickLoginEnabled(u.businessId as string))) continue;
    const initial = String(u.lastName ?? "").trim().charAt(0).toUpperCase();
    result.push({ id: u.id as string, name: `${u.firstName}${initial ? ` ${initial}.` : ""}` });
  }
  return result;
}

const WEAK_PINS = new Set(["0000", "1111", "2222", "3333", "4444", "5555", "6666", "7777", "8888", "9999", "1234", "4321", "0123"]);

export function validatePinFormat(pin: string): string | null {
  if (!/^\d{4}$/.test(pin)) return "Le PIN doit contenir exactement 4 chiffres.";
  if (WEAK_PINS.has(pin)) return "Ce PIN est trop facile à deviner. Choisissez-en un autre.";
  return null;
}

export type PinCheck =
  | { ok: true; userId: string; businessId: string; role: string }
  | { ok: false; reason: "invalid" | "locked" | "unavailable" };

export async function verifyPin(userId: string, pin: string): Promise<PinCheck> {
  if (!/^\d{4}$/.test(pin)) return { ok: false, reason: "invalid" };
  if (!(await isThisDeviceTrusted(userId))) return { ok: false, reason: "unavailable" };

  const columns =
    "id, businessId:business_id, role, active, pinHash:pin_hash, attempts:pin_failed_attempts, failedAt:pin_failed_at";
  const first = await supabase
    .from("users")
    .select(`${columns}, totpEnabled:totp_enabled`)
    .eq("id", userId)
    .maybeSingle();
  let user = first.data;
  if (first.error && /totp/.test(first.error.message)) {
    const fallback = await supabase.from("users").select(columns).eq("id", userId).maybeSingle();
    user = fallback.data ? { ...fallback.data, totpEnabled: false } : null;
  }
  if (!user || !user.active || !user.pinHash || user.totpEnabled) return { ok: false, reason: "unavailable" };
  if (!(await isQuickLoginEnabled(user.businessId as string))) return { ok: false, reason: "unavailable" };

  let attempts = (user.attempts as number) ?? 0;
  if (attempts >= MAX_PIN_ATTEMPTS) {
    const last = user.failedAt ? new Date(user.failedAt as string).getTime() : 0;
    if (Date.now() - last < PIN_LOCK_MINUTES * 60_000) return { ok: false, reason: "locked" };
    attempts = 0; // Blocage expiré : on repart de zéro.
  }

  const valid = await bcrypt.compare(pin, user.pinHash as string);
  if (!valid) {
    const next = attempts + 1;
    await supabase
      .from("users")
      .update({ pin_failed_attempts: next, pin_failed_at: new Date().toISOString() })
      .eq("id", userId);
    return { ok: false, reason: next >= MAX_PIN_ATTEMPTS ? "locked" : "invalid" };
  }

  if (attempts > 0 || (user.attempts as number) > 0) {
    await supabase.from("users").update({ pin_failed_attempts: 0, pin_failed_at: null }).eq("id", userId);
  }
  const token = await readDeviceToken();
  if (token) {
    await supabase
      .from("trusted_devices")
      .update({ last_used_at: new Date().toISOString() })
      .eq("token_hash", sha256(token))
      .eq("user_id", userId);
  }
  return { ok: true, userId, businessId: user.businessId as string, role: user.role as string };
}

export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, 10);
}

// --------------------------------------------------------------------------
// Clés d'accès (WebAuthn)
// --------------------------------------------------------------------------

export type PasskeyRow = { id: string; label: string | null; createdAt: string; lastUsedAt: string | null };

export async function listPasskeys(userId: string): Promise<PasskeyRow[] | null> {
  const { data, error } = await supabase
    .from("passkeys")
    .select("id, label, createdAt:created_at, lastUsedAt:last_used_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) {
    console.error("[listPasskeys] Échec :", error.message);
    return null;
  }
  return (data ?? []) as PasskeyRow[];
}

/** Domaine et adresse du site, déduits de la requête mais limités aux adresses connues de ZINDO. */
export async function getRelyingParty(): Promise<{ rpID: string; origin: string; rpName: string }> {
  const h = await headers();
  const host = (h.get("x-forwarded-host") ?? h.get("host") ?? "").split(",")[0].trim().toLowerCase();
  const hostname = host.split(":")[0];
  const allowed = new Set(["www.zindo.site", "zindo.site", "localhost"]);
  try {
    if (process.env.NEXT_PUBLIC_APP_URL) allowed.add(new URL(process.env.NEXT_PUBLIC_APP_URL).hostname);
  } catch {
    // Adresse mal formée dans l'environnement : on ignore.
  }
  if (!allowed.has(hostname)) throw new Error(`Domaine non autorisé pour les clés d'accès : ${hostname}`);
  const proto = h.get("x-forwarded-proto")?.split(",")[0].trim() ?? (hostname === "localhost" ? "http" : "https");
  return { rpID: hostname, origin: `${proto}://${host}`, rpName: "ZINDO" };
}

export async function storeChallenge(payload: { challenge: string; kind: "reg" | "auth"; userId?: string }) {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${CHALLENGE_SECONDS}s`)
    .sign(sessionSecret());
  (await cookies()).set(CHALLENGE_COOKIE, token, cookieOptions(CHALLENGE_SECONDS));
}

/** Lit puis efface le défi : un défi ne sert qu'une seule fois. */
export async function takeChallenge(kind: "reg" | "auth"): Promise<{ challenge: string; userId?: string } | null> {
  const store = await cookies();
  const token = store.get(CHALLENGE_COOKIE)?.value;
  store.delete(CHALLENGE_COOKIE);
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, sessionSecret());
    if (payload.kind !== kind || typeof payload.challenge !== "string") return null;
    return { challenge: payload.challenge, userId: typeof payload.userId === "string" ? payload.userId : undefined };
  } catch {
    return null;
  }
}

export async function setPasskeyHint() {
  (await cookies()).set(PASSKEY_HINT_COOKIE, "1", cookieOptions(ONE_YEAR_SECONDS));
}

export async function clearPasskeyHint() {
  (await cookies()).delete(PASSKEY_HINT_COOKIE);
}

export async function hasPasskeyHint(): Promise<boolean> {
  return (await cookies()).get(PASSKEY_HINT_COOKIE)?.value === "1";
}

export function bytesToBase64Url(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64url");
}

export function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  return new Uint8Array(Buffer.from(value, "base64url"));
}

/** Ce que la page de connexion doit afficher pour cet appareil (rien tant que rien n'est activé). */
export async function getQuickLoginOptions(): Promise<{ users: QuickUser[]; passkey: boolean }> {
  try {
    const [users, passkey] = await Promise.all([listPinUsersOnThisDevice(), hasPasskeyHint()]);
    return { users, passkey };
  } catch (e) {
    console.error("[getQuickLoginOptions] Ignoré :", e instanceof Error ? e.message : e);
    return { users: [], passkey: false };
  }
}

/** État affiché dans Mon profil. `ready` est faux tant que la mise à jour de la base de données n'est pas faite. */
export async function getQuickLoginStatus(userId: string): Promise<{
  ready: boolean;
  pinSet: boolean;
  deviceTrusted: boolean;
  passkeys: PasskeyRow[];
}> {
  const { data, error } = await supabase.from("users").select("pin_hash").eq("id", userId).maybeSingle();
  const passkeys = await listPasskeys(userId);
  if (error || passkeys === null) return { ready: false, pinSet: false, deviceTrusted: false, passkeys: [] };
  return {
    ready: true,
    pinSet: Boolean(data?.pin_hash),
    deviceTrusted: await isThisDeviceTrusted(userId),
    passkeys,
  };
}
