"use server";

import bcrypt from "bcryptjs";
import { supabase } from "@/lib/supabase";
import { requireUser } from "@/lib/auth";
import {
  generateTotpSecret,
  totpAuthUri,
  verifyTotp,
  generateBackupCodes,
  hashBackupCodes,
} from "@/lib/totp";
import { generateQrDataUrl } from "@/lib/qrcode";

// Réservé au rôle ADMIN du commerce (pas Founder/plateforme, voir
// lib/actions/admin-two-factor.ts pour ce compte-là) — un vendeur ou
// gestionnaire de stock ne doit jamais pouvoir activer/désactiver la 2FA,
// même s'il a par ailleurs la permission SETTINGS_MANAGE.
async function requireBusinessAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw new Error("Réservé à l'administrateur du commerce");
  return user;
}

export type StartEnrollmentResult = { error: string } | { secret: string; qrDataUrl: string };

export async function startTotpEnrollmentAction(): Promise<StartEnrollmentResult> {
  const user = await requireBusinessAdmin();
  const secret = generateTotpSecret();
  const uri = totpAuthUri(secret, `${user.firstName} ${user.lastName}`);
  const qrDataUrl = await generateQrDataUrl(uri);
  return { secret, qrDataUrl };
}

export type ConfirmEnrollmentResult = { error: string } | { backupCodes: string[] };

export async function confirmTotpEnrollmentAction(secret: string, code: string): Promise<ConfirmEnrollmentResult> {
  const user = await requireBusinessAdmin();
  if (!verifyTotp(secret, code)) return { error: "Code invalide — vérifiez l'heure de votre téléphone et réessayez" };

  const backupCodes = generateBackupCodes();
  const { error } = await supabase
    .from("users")
    .update({
      totp_secret: secret,
      totp_enabled: true,
      totp_backup_codes: await hashBackupCodes(backupCodes),
    })
    .eq("id", user.id);
  if (error) {
    console.error("[confirmTotpEnrollmentAction] Échec de l'activation :", error.message);
    return { error: "Impossible d'activer la 2FA" };
  }

  return { backupCodes };
}

export type ActionState = { error?: string; success?: string } | undefined;

export async function disableTotpAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireBusinessAdmin();
  const password = String(formData.get("password") ?? "");
  if (!password) return { error: "Mot de passe requis" };

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return { error: "Mot de passe incorrect" };

  const { error } = await supabase
    .from("users")
    .update({ totp_enabled: false, totp_secret: null, totp_backup_codes: null })
    .eq("id", user.id);
  if (error) {
    console.error("[disableTotpAction] Échec de la désactivation :", error.message);
    return { error: "Impossible de désactiver la 2FA" };
  }

  return { success: "2FA désactivée" };
}
