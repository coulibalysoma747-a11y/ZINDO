"use server";

import { randomBytes, createHash } from "crypto";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { supabase } from "@/lib/supabase";
import { isEmailConfigured, sendPasswordResetEmail } from "@/lib/email";

export type ActionState = { error?: string; success?: boolean } | undefined;

const RESET_TOKEN_TTL_MINUTES = 30;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

async function getOrigin() {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("host");
  return `${proto}://${host}`;
}

const requestSchema = z.object({
  email: z.string().email("E-mail invalide"),
});

/**
 * Toujours répondre par le même message de succès générique, que le compte
 * existe ou non et que l'e-mail parte réellement ou non — évite qu'un
 * attaquant puisse déduire quels e-mails sont enregistrés dans ZINDO.
 */
export async function requestPasswordResetAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = requestSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "E-mail invalide" };
  }

  if (!isEmailConfigured()) {
    // Configuration serveur manquante : contrairement à "compte introuvable"
    // (qu'on masque volontairement), c'est un vrai problème à signaler.
    console.error("[requestPasswordResetAction] RESEND_API_KEY manquant");
    return { error: "L'envoi d'e-mails n'est pas configuré pour le moment. Réessayez plus tard." };
  }

  const email = parsed.data.email.trim();
  const emailPattern = email.replace(/[%_\\]/g, (m) => `\\${m}`);

  const { data: user } = await supabase
    .from("users")
    .select("id, email, active")
    .ilike("email", emailPattern)
    .maybeSingle();

  if (user && user.active) {
    const token = randomBytes(32).toString("hex");
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60_000).toISOString();

    const { error: insertError } = await supabase
      .from("password_reset_tokens")
      .insert({ user_id: user.id, token_hash: tokenHash, expires_at: expiresAt });

    if (insertError) {
      console.error("[requestPasswordResetAction] Échec création token :", insertError.message);
    } else {
      try {
        const origin = await getOrigin();
        const resetUrl = `${origin}/reinitialiser-mot-de-passe?token=${token}`;
        await sendPasswordResetEmail(user.email as string, resetUrl);
      } catch (e) {
        console.error("[requestPasswordResetAction] Échec envoi e-mail :", e);
      }
    }
  }

  return { success: true };
}

const resetSchema = z
  .object({
    token: z.string().min(1),
    password: z.string().min(6, "6 caractères minimum"),
    confirmPassword: z.string().min(1),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

export async function resetPasswordAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = resetSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Champs invalides" };
  }
  const { token, password } = parsed.data;
  const tokenHash = hashToken(token);

  const { data: reset } = await supabase
    .from("password_reset_tokens")
    .select("id, userId:user_id, expiresAt:expires_at, usedAt:used_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (!reset || reset.usedAt || new Date(reset.expiresAt as string) < new Date()) {
    return { error: "Ce lien de réinitialisation est invalide ou a expiré. Refaites une demande." };
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const { error: updateError } = await supabase
    .from("users")
    .update({ password_hash: passwordHash })
    .eq("id", reset.userId);

  if (updateError) {
    console.error("[resetPasswordAction] Échec mise à jour mot de passe :", updateError.message);
    return { error: "Impossible de réinitialiser le mot de passe. Réessayez." };
  }

  await supabase
    .from("password_reset_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("id", reset.id);

  redirect("/login?reinitialisation=ok");
}
