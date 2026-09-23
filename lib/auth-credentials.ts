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

/**
 * Formes possibles d'un même numéro : le téléphone est enregistré tel qu'il a
 * été tapé à l'inscription (« 70 12 34 56 », « 70123456 », « +226 70… »), et
 * la connexion comparait jusqu'ici la saisie à l'identique. On essaie donc
 * les variantes courantes (sans espaces, avec/sans indicatif, par paires).
 */
function phoneVariants(identifier: string): string[] {
  const digits = identifier.replace(/\D/g, "");
  if (digits.length < 8) return [];
  const local = digits.length > 8 ? digits.slice(-8) : digits;
  const pairs = local.replace(/(\d{2})(?=\d)/g, "$1 ");
  const prefix = digits.length > 8 ? digits.slice(0, digits.length - 8) : "226";
  return [
    ...new Set([
      local,
      pairs,
      `+${prefix}${local}`,
      `${prefix}${local}`,
      `00${prefix}${local}`,
      `+${prefix} ${pairs}`,
      `+${prefix} ${local}`,
    ]),
  ].filter((v) => v !== identifier);
}

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

  // Pas trouvé tel quel : on tente les autres écritures du même numéro. Utilisé
  // seulement s'il n'y a qu'UN compte correspondant, pour ne jamais confondre deux comptes.
  if (!user && !identifier.includes("@")) {
    const variants = phoneVariants(identifier);
    if (variants.length > 0) {
      const { data: matches } = await supabase
        .from("users")
        .select(
          "id, businessId:business_id, role, active, passwordHash:password_hash, totpEnabled:totp_enabled, failedLoginAttempts:failed_login_attempts"
        )
        .in("phone", variants)
        .limit(2);
      if (matches && matches.length === 1) user = matches[0];
    }
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
