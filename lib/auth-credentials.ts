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

/**
 * Après 5 mauvais mots de passe d'affilée, le compte est bloqué 15 minutes.
 * Avant, la 3e erreur désactivait le compte pour de bon (active = false) : il
 * suffisait de connaître le numéro d'un commerçant pour le mettre dehors, et
 * seul un administrateur pouvait le réactiver. Le blocage est maintenant
 * temporaire et se lève tout seul ; la date du dernier échec est gardée dans
 * `updated_at` (aucun déclencheur ne la modifie ailleurs), sans migration.
 */
const MAX_FAILED_LOGIN_ATTEMPTS = 5;
export const LOGIN_LOCK_MINUTES = 15;

export type MerchantCredentialResult =
  | { ok: true; userId: string; businessId: string; role: string; totpEnabled: boolean }
  | { ok: false; locked?: boolean; disabled?: boolean };

/**
 * Formes possibles d'un même numéro : le téléphone est enregistré tel qu'il a
 * été tapé à l'inscription (« 70 12 34 56 », « 70123456 », « +226 70… »), et
 * la connexion comparait jusqu'ici la saisie à l'identique. On essaie donc
 * les variantes courantes (sans espaces, avec/sans indicatif, par paires).
 */
export function phoneVariants(identifier: string): string[] {
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
  // Un téléphone ou un e-mail ne contient jamais ces caractères ; ils
  // casseraient le filtre `.or()` de PostgREST ci-dessous.
  if (/[,()"\\]/.test(identifier)) return { ok: false };

  // `%`/`_` échappés pour ne pas être interprétés comme des jokers ILIKE.
  const emailPattern = identifier.replace(/[%_\\]/g, (m) => `\\${m}`);

  const initialUserQuery = await supabase
    .from("users")
    .select(
      "id, businessId:business_id, role, active, passwordHash:password_hash, totpEnabled:totp_enabled, failedLoginAttempts:failed_login_attempts, updatedAt:updated_at"
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
        "id, businessId:business_id, role, active, passwordHash:password_hash, failedLoginAttempts:failed_login_attempts, updatedAt:updated_at"
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
          "id, businessId:business_id, role, active, passwordHash:password_hash, totpEnabled:totp_enabled, failedLoginAttempts:failed_login_attempts, updatedAt:updated_at"
        )
        .in("phone", variants)
        .limit(2);
      if (matches && matches.length === 1) user = matches[0];
    }
  }

  if (!user) return { ok: false };

  let previousAttempts = (user.failedLoginAttempts as number) ?? 0;
  if (previousAttempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
    const lastFailure = new Date(user.updatedAt as string).getTime();
    if (Date.now() - lastFailure < LOGIN_LOCK_MINUTES * 60_000) return { ok: false, locked: true };
    previousAttempts = 0; // Blocage expiré : on repart de zéro.
  }

  const valid = await bcrypt.compare(password, user.passwordHash as string);
  if (!valid) {
    const attempts = previousAttempts + 1;
    await supabase
      .from("users")
      .update({ failed_login_attempts: attempts, updated_at: new Date().toISOString() })
      .eq("id", user.id as string);
    return { ok: false, locked: attempts >= MAX_FAILED_LOGIN_ATTEMPTS };
  }

  // Le compte désactivé n'est signalé qu'avec le bon mot de passe, pour ne
  // rien apprendre à quelqu'un qui essaie des numéros au hasard.
  if (!user.active) return { ok: false, disabled: true };

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
