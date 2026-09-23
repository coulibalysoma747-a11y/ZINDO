import "server-only";
import bcrypt from "bcryptjs";
import { supabase } from "@/lib/supabase";

/**
 * Vérification identifiant + mot de passe pour un compte commerçant (table
 * `users`), avec le verrouillage après tentatives échouées — logique
 * factorisée hors de lib/actions/auth.ts loginAction pour être appelée aussi
 * depuis app/api/desktop/login/route.ts (connexion de l'application Windows,
 * qui n'a plus d'accès direct à Supabase — voir lib/supabase.ts). Ne gère ni
 * la redirection ni la session : c'est au responsable de l'appel de décider
 * quoi faire du résultat.
 */

const MAX_FAILED_LOGIN_ATTEMPTS = 3;

export type MerchantCredentialResult =
  | { ok: true; userId: string; businessId: string; role: string; totpEnabled: boolean }
  | { ok: false };

export async function verifyMerchantCredentials(
  identifier: string,
  password: string
): Promise<MerchantCredentialResult> {
  // `%`/`_` échappés pour ne pas être interprétés comme des jokers ILIKE.
  const emailPattern = identifier.replace(/[%_\\]/g, (m) => `\\${m}`);

  const initialUserQuery = await supabase
    .from("users")
    .select(
      "id, businessId:business_id, role, active, passwordHash:password_hash, totpEnabled:totp_enabled, failedLoginAttempts:failed_login_attempts"
    )
    .or(`phone.eq.${identifier},email.ilike.${emailPattern}`)
    .maybeSingle();
  let user = initialUserQuery.data;
  let error = initialUserQuery.error;
  // Repli si totp_enabled n'est pas encore migré côté base — même logique
  // défensive qu'ailleurs (voir lib/auth.ts getCurrentUser).
  if (error && /totp/.test(error.message)) {
    const fallback = await supabase
      .from("users")
      .select(
        "id, businessId:business_id, role, active, passwordHash:password_hash, failedLoginAttempts:failed_login_attempts"
      )
      .or(`phone.eq.${identifier},email.ilike.${emailPattern}`)
      .maybeSingle();
    user = fallback.data ? { ...fallback.data, totpEnabled: false } : null;
    error = fallback.error;
  }

  if (error) {
    console.error("[verifyMerchantCredentials] Échec de la requête Supabase :", error.message);
  }

  if (!user || !user.active) return { ok: false };

  const valid = await bcrypt.compare(password, user.passwordHash as string);
  if (!valid) {
    const attempts = ((user.failedLoginAttempts as number) ?? 0) + 1;
    await supabase
      .from("users")
      .update(
        attempts >= MAX_FAILED_LOGIN_ATTEMPTS
          ? { failed_login_attempts: attempts, active: false }
          : { failed_login_attempts: attempts }
      )
      .eq("id", user.id as string);
    return { ok: false };
  }

  if ((user.failedLoginAttempts as number) > 0) {
    await supabase.from("users").update({ failed_login_attempts: 0 }).eq("id", user.id as string);
  }

  return {
    ok: true,
    userId: user.id as string,
    businessId: user.businessId as string,
    role: user.role as string,
    totpEnabled: Boolean(user.totpEnabled),
  };
}
