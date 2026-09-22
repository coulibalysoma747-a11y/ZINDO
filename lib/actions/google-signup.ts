"use server";

import { randomBytes, randomInt } from "crypto";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { createSession, getPendingGoogleSignupSession, createPendingGoogleSignupSession, destroyPendingGoogleSignupSession } from "@/lib/session";
import { isEmailConfigured, sendVerificationCodeEmail } from "@/lib/email";
import { registerFeatureFlag, isFeatureEnabledGlobally } from "@/lib/feature-flags";
import type { Role } from "@/lib/db-types";
import { isCountryCode, countryNameFr, DEFAULT_COUNTRY_CODE } from "@/lib/countries";

export type ActionState = { error?: string } | undefined;

/**
 * Inscription via Google : nouvelle fonctionnalité, désactivée par défaut
 * tant qu'elle n'est pas explicitement activée depuis /admin/fonctionnalites
 * — voir la règle du memory "Feature rollout rule". Pas de businessId à ce
 * stade (aucun commerce n'existe encore), donc vérification globale
 * uniquement — les dérogations par commerce n'ont pas de sens ici.
 */
const GOOGLE_SIGNUP_FLAG = "inscription_google";

export async function ensureGoogleSignupFlagRegistered() {
  await registerFeatureFlag(
    GOOGLE_SIGNUP_FLAG,
    "Inscription avec Google",
    "Permet de créer un compte ZINDO à partir d'un compte Google (avec confirmation de l'e-mail par code) quand aucun compte existant n'est trouvé."
  );
}

export async function isGoogleSignupEnabled() {
  return isFeatureEnabledGlobally(GOOGLE_SIGNUP_FLAG);
}

const CODE_TTL_MS = 10 * 60 * 1000;
const MAX_CODE_ATTEMPTS = 5;

const profileSchema = z.object({
  phone: z.string().min(6, "Numéro de téléphone invalide"),
  businessName: z.string().min(1, "Nom du commerce requis"),
  city: z.string().optional(),
  country: z.string().min(1, "Pays requis"),
});

export async function submitGoogleSignupProfileAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const pending = await getPendingGoogleSignupSession();
  if (!pending) redirect("/login");

  const parsed = profileSchema.safeParse({
    phone: formData.get("phone"),
    businessName: formData.get("businessName"),
    city: formData.get("city") || undefined,
    country: formData.get("country") || "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Champs invalides" };
  }
  const { phone, businessName, city, country } = parsed.data;
  if (!isCountryCode(country)) {
    return { error: "Pays invalide" };
  }

  if (!isEmailConfigured()) {
    console.error("[submitGoogleSignupProfileAction] RESEND_API_KEY manquant");
    return { error: "L'envoi d'e-mails n'est pas configuré pour le moment. Réessayez plus tard." };
  }

  const { data: existing } = await supabase.from("users").select("id").eq("phone", phone).maybeSingle();
  if (existing) {
    return { error: "Ce numéro de téléphone est déjà utilisé" };
  }

  const code = String(randomInt(100000, 1000000));

  try {
    await sendVerificationCodeEmail(pending.email, code, pending.firstName);
  } catch (err) {
    console.error("[submitGoogleSignupProfileAction] Échec de l'envoi de l'e-mail :", err);
    return { error: "Impossible d'envoyer le code de confirmation pour le moment. Réessayez plus tard." };
  }

  await createPendingGoogleSignupSession({
    ...pending,
    phone,
    businessName,
    city,
    country,
    code,
    codeExpiresAt: Date.now() + CODE_TTL_MS,
    attempts: 0,
  });

  redirect("/inscription-google/confirmer");
}

export async function confirmGoogleSignupCodeAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const code = String(formData.get("code") ?? "").trim();
  if (!code) return { error: "Code requis" };

  const pending = await getPendingGoogleSignupSession();
  if (!pending || !pending.code) redirect("/login");

  if ((pending.attempts ?? 0) >= MAX_CODE_ATTEMPTS) {
    await destroyPendingGoogleSignupSession();
    return { error: "Trop de tentatives — recommencez l'inscription." };
  }

  if (!pending.codeExpiresAt || Date.now() > pending.codeExpiresAt) {
    await destroyPendingGoogleSignupSession();
    return { error: "Code expiré — recommencez l'inscription." };
  }

  if (code !== pending.code) {
    await createPendingGoogleSignupSession({ ...pending, attempts: (pending.attempts ?? 0) + 1 });
    return { error: "Code invalide" };
  }

  const passwordHash = await bcrypt.hash(randomBytes(24).toString("hex"), 10);

  const { data, error } = await supabase.rpc("register_business", {
    p_business_name: pending.businessName,
    p_city: pending.city ?? null,
    p_country: countryNameFr(isCountryCode(pending.country) ? pending.country : DEFAULT_COUNTRY_CODE),
    p_first_name: pending.firstName,
    p_last_name: pending.lastName,
    p_phone: pending.phone,
    p_email: pending.email,
    p_password_hash: passwordHash,
  });

  if (error || !data || data.length === 0) {
    console.error("[confirmGoogleSignupCodeAction] Échec de la création :", error?.message);
    return { error: "Impossible de créer le compte. Réessayez." };
  }

  const row = data[0] as { user_id: string; business_id: string; role: string };
  await destroyPendingGoogleSignupSession();
  await createSession({ userId: row.user_id, businessId: row.business_id, role: row.role as Role });
  redirect("/dashboard");
}

export async function cancelGoogleSignupAction() {
  await destroyPendingGoogleSignupSession();
  redirect("/login");
}
