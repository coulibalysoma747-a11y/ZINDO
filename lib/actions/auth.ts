"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { supabase, setDesktopSupabaseClient } from "@/lib/supabase";
import { verifyMerchantCredentials } from "@/lib/auth-credentials";
import { isDesktopBuild, writeAuthCache } from "@/lib/offline/auth-cache";
import { getCurrentUser } from "@/lib/auth";
import {
  createSession,
  destroySession,
  createPending2FASession,
  getPending2FASession,
  destroyPending2FASession,
} from "@/lib/session";
import {
  createAdminSession,
  createAdminPending2FASession,
  getAdminPending2FASession,
  destroyAdminPending2FASession,
} from "@/lib/adminSession";
import { verifyTotp, consumeBackupCode } from "@/lib/totp";
import type { Role } from "@/lib/db-types";
import { attachReferralFromSignup } from "@/lib/referral-signup";
import { isCountryCode, countryNameFr } from "@/lib/countries";

export type ActionState = { error?: string } | undefined;

// Messages traduits pour les deux seules pages actuellement disponibles en
// anglais (voir app/en/login, app/en/inscription) — un champ caché "locale"
// dans chaque formulaire indique laquelle utiliser ; "fr" par défaut sinon.
// Les messages de validation zod ci-dessous (champ vide/trop court) restent
// en français : ils ne se déclenchent qu'en contournant l'attribut HTML
// "required" des champs, un cas marginal non couvert par cette première
// passe de traduction.
const AUTH_MESSAGES = {
  fr: {
    invalidFields: "Champs invalides",
    wrongCredentials: "Identifiants incorrects",
    mustAcceptTerms: "Vous devez accepter les CGU et la politique de confidentialité",
    phoneAlreadyUsed: "Ce numéro de téléphone est déjà utilisé",
    createAccountFailed: "Impossible de créer le compte. Réessayez.",
  },
  en: {
    invalidFields: "Invalid fields",
    wrongCredentials: "Incorrect login details",
    mustAcceptTerms: "You must accept the Terms of Service and Privacy Policy",
    phoneAlreadyUsed: "This phone number is already in use",
    createAccountFailed: "Could not create the account. Please try again.",
  },
} as const;

function getAuthLocale(formData: FormData): keyof typeof AUTH_MESSAGES {
  return formData.get("locale") === "en" ? "en" : "fr";
}

const loginSchema = z.object({
  identifier: z.string().min(3, "Renseignez votre téléphone ou e-mail"),
  password: z.string().min(1, "Mot de passe requis"),
});

export async function loginAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const t = AUTH_MESSAGES[getAuthLocale(formData)];
  const parsed = loginSchema.safeParse({
    identifier: formData.get("identifier"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? t.invalidFields };
  }
  const { identifier, password } = parsed.data;
  const trimmedIdentifier = identifier.trim();

  if (isDesktopBuild()) {
    return loginActionDesktop(trimmedIdentifier, password, t);
  }

  const merchantResult = await verifyMerchantCredentials(trimmedIdentifier, password);
  if (merchantResult.ok) {
    if (merchantResult.totpEnabled) {
      await createPending2FASession({
        userId: merchantResult.userId,
        businessId: merchantResult.businessId,
        role: merchantResult.role,
        attempts: 0,
      });
      redirect("/verifier-2fa");
    }
    await createSession({
      userId: merchantResult.userId,
      businessId: merchantResult.businessId,
      role: merchantResult.role,
    });
    redirect("/dashboard");
  }

  // Aucun compte commerçant correspondant (ou mot de passe invalide) : on
  // tente le compte propriétaire de la plateforme, pour que le créateur
  // puisse se connecter depuis ce même formulaire sans passer par /admin/login.
  // L'email est comparé sans tenir compte de la casse (ex. clavier mobile qui
  // met une majuscule automatique au premier caractère) — `%`/`_` sont
  // échappés pour ne pas être interprétés comme des jokers ILIKE.
  const emailPattern = trimmedIdentifier.replace(/[%_\\]/g, (m) => `\\${m}`);
  const initialAdminQuery = await supabase
    .from("super_admins")
    .select("id, passwordHash:password_hash, totpEnabled:totp_enabled")
    .ilike("email", emailPattern)
    .maybeSingle();
  let admin = initialAdminQuery.data;
  if (initialAdminQuery.error && /totp/.test(initialAdminQuery.error.message)) {
    const fallback = await supabase
      .from("super_admins")
      .select("id, passwordHash:password_hash")
      .ilike("email", emailPattern)
      .maybeSingle();
    admin = fallback.data ? { ...fallback.data, totpEnabled: false } : null;
  }

  if (admin) {
    const validAdmin = await bcrypt.compare(password, admin.passwordHash as string);
    if (validAdmin) {
      if (admin.totpEnabled) {
        await createAdminPending2FASession({ adminId: admin.id as string, attempts: 0 });
        redirect("/verifier-2fa");
      }
      await createAdminSession({ adminId: admin.id as string });
      redirect("/admin");
    }
  }

  return { error: t.wrongCredentials };
}

/**
 * Connexion depuis l'application Windows : le serveur local n'a plus d'accès
 * direct à Supabase (voir lib/supabase.ts), donc la vérification du mot de
 * passe est déléguée à app/api/desktop/login/route.ts sur le déploiement web.
 * En cas de succès, on reçoit un jeton Supabase limité au commerce du
 * commerçant, utilisé pour toutes les requêtes suivantes de ce processus.
 * Ne gère pas encore le 2FA (voir la route) ni le compte propriétaire de la
 * plateforme — hors du périmètre de l'application desktop.
 */
async function loginActionDesktop(
  identifier: string,
  password: string,
  t: (typeof AUTH_MESSAGES)[keyof typeof AUTH_MESSAGES]
): Promise<ActionState> {
  const baseUrl = process.env.ZINDO_PRODUCTION_URL;
  if (!baseUrl) {
    console.error("[loginActionDesktop] ZINDO_PRODUCTION_URL manquant");
    return { error: t.wrongCredentials };
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/api/desktop/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, password }),
    });
  } catch (e) {
    console.error("[loginActionDesktop] Serveur ZINDO injoignable :", e);
    return { error: "Connexion au serveur ZINDO impossible. Vérifiez votre connexion Internet." };
  }

  if (response.status === 403) {
    return {
      error: "La double authentification (2FA) n'est pas encore prise en charge sur l'application Windows — connectez-vous depuis le site web.",
    };
  }
  if (!response.ok) {
    return { error: t.wrongCredentials };
  }

  const data = (await response.json()) as {
    userId: string;
    businessId: string;
    role: string;
    supabaseAccessToken: string;
  };

  setDesktopSupabaseClient(data.supabaseAccessToken);
  await createSession({ userId: data.userId, businessId: data.businessId, role: data.role });
  const user = await getCurrentUser();
  if (user) await writeAuthCache(user.id, { user });
  redirect("/dashboard");
}

const MAX_2FA_ATTEMPTS = 5;

export async function verify2FAAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const code = String(formData.get("code") ?? "").trim();
  if (!code) return { error: "Code requis" };

  const tooManyAttemptsError = "Trop de tentatives — reconnectez-vous.";

  const userPending = await getPending2FASession();
  if (userPending) {
    if (userPending.attempts >= MAX_2FA_ATTEMPTS) {
      await destroyPending2FASession();
      return { error: tooManyAttemptsError };
    }
    const { data: u } = await supabase
      .from("users")
      .select("totpSecret:totp_secret, totpBackupCodes:totp_backup_codes")
      .eq("id", userPending.userId)
      .maybeSingle();
    if (!u) {
      await destroyPending2FASession();
      return { error: "Session expirée — reconnectez-vous." };
    }

    let ok = u.totpSecret ? verifyTotp(u.totpSecret as string, code) : false;
    let newBackupCodes: string | null | undefined;
    if (!ok) {
      const consumed = await consumeBackupCode(u.totpBackupCodes as string | null, code);
      if (consumed.ok) {
        ok = true;
        newBackupCodes = consumed.remaining;
      }
    }

    if (!ok) {
      await createPending2FASession({ ...userPending, attempts: userPending.attempts + 1 });
      return { error: "Code invalide" };
    }

    if (newBackupCodes !== undefined) {
      await supabase.from("users").update({ totp_backup_codes: newBackupCodes }).eq("id", userPending.userId);
    }
    await destroyPending2FASession();
    await createSession({
      userId: userPending.userId,
      businessId: userPending.businessId,
      role: userPending.role,
    });
    redirect("/dashboard");
  }

  const adminPending = await getAdminPending2FASession();
  if (adminPending) {
    if (adminPending.attempts >= MAX_2FA_ATTEMPTS) {
      await destroyAdminPending2FASession();
      return { error: tooManyAttemptsError };
    }
    const { data: a } = await supabase
      .from("super_admins")
      .select("totpSecret:totp_secret, totpBackupCodes:totp_backup_codes")
      .eq("id", adminPending.adminId)
      .maybeSingle();
    if (!a) {
      await destroyAdminPending2FASession();
      return { error: "Session expirée — reconnectez-vous." };
    }

    let ok = a.totpSecret ? verifyTotp(a.totpSecret as string, code) : false;
    let newBackupCodes: string | null | undefined;
    if (!ok) {
      const consumed = await consumeBackupCode(a.totpBackupCodes as string | null, code);
      if (consumed.ok) {
        ok = true;
        newBackupCodes = consumed.remaining;
      }
    }

    if (!ok) {
      await createAdminPending2FASession({ ...adminPending, attempts: adminPending.attempts + 1 });
      return { error: "Code invalide" };
    }

    if (newBackupCodes !== undefined) {
      await supabase.from("super_admins").update({ totp_backup_codes: newBackupCodes }).eq("id", adminPending.adminId);
    }
    await destroyAdminPending2FASession();
    await createAdminSession({ adminId: adminPending.adminId });
    redirect("/admin");
  }

  return { error: "Session expirée — reconnectez-vous." };
}

const registerSchema = z.object({
  firstName: z.string().min(1, "Prénom requis"),
  lastName: z.string().min(1, "Nom requis"),
  phone: z.string().min(6, "Numéro de téléphone invalide"),
  email: z.string().email("E-mail invalide").optional().or(z.literal("")),
  password: z.string().min(6, "6 caractères minimum"),
  businessName: z.string().min(1, "Nom du commerce requis"),
  city: z.string().optional(),
  country: z.string().min(1, "Pays requis"),
});

export async function registerAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const t = AUTH_MESSAGES[getAuthLocale(formData)];
  if (formData.get("acceptTerms") !== "on") {
    return { error: t.mustAcceptTerms };
  }

  const parsed = registerSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    phone: formData.get("phone"),
    email: formData.get("email") || "",
    password: formData.get("password"),
    businessName: formData.get("businessName"),
    city: formData.get("city") || undefined,
    country: formData.get("country") || "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? t.invalidFields };
  }

  const { firstName, lastName, phone, email, password, businessName, city, country } = parsed.data;
  if (!isCountryCode(country)) {
    return { error: "Pays invalide" };
  }
  const countryCode = country;

  const { data: existing } = await supabase.from("users").select("id").eq("phone", phone).maybeSingle();
  if (existing) {
    return { error: t.phoneAlreadyUsed };
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const { data, error } = await supabase.rpc("register_business", {
    p_business_name: businessName,
    p_city: city ?? null,
    p_country: countryNameFr(countryCode),
    p_first_name: firstName,
    p_last_name: lastName,
    p_phone: phone,
    p_email: email ?? "",
    p_password_hash: passwordHash,
  });

  if (error || !data || data.length === 0) {
    return { error: t.createAccountFailed };
  }

  const row = data[0] as { user_id: string; business_id: string; role: string };
  await attachReferralFromSignup({ businessId: row.business_id, phone, typedCode: formData.get("referralCode") });
  await createSession({ userId: row.user_id, businessId: row.business_id, role: row.role as Role });
  redirect("/dashboard");
}

export async function logoutAction() {
  await destroySession();
  // Redirige vers la page de tarifs plutôt que /login directement — la
  // demande explicite du propriétaire est que le rappel des formules
  // d'abonnement s'affiche systématiquement à la déconnexion.
  redirect("/tarifs");
}
