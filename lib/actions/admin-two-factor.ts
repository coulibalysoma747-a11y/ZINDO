"use server";

import bcrypt from "bcryptjs";
import { supabase } from "@/lib/supabase";
import { requireSuperAdmin } from "@/lib/superadmin-auth";
import {
  generateTotpSecret,
  totpAuthUri,
  verifyTotp,
  generateBackupCodes,
  hashBackupCodes,
} from "@/lib/totp";
import { generateQrDataUrl } from "@/lib/qrcode";

// Réservé au compte Créateur/Fondateur — voir lib/actions/two-factor.ts pour
// l'équivalent côté commerce (rôle ADMIN). Un administrateur "simple" (role
// ADMIN côté plateforme) ne doit pas pouvoir activer/désactiver sa propre 2FA
// depuis cette route, réservée au Fondateur.
async function requireFounderAccount() {
  const admin = await requireSuperAdmin();
  if (admin.role !== "FOUNDER") throw new Error("Réservé au compte Fondateur");
  return admin;
}

export type StartEnrollmentResult = { error: string } | { secret: string; qrDataUrl: string };

export async function startAdminTotpEnrollmentAction(): Promise<StartEnrollmentResult> {
  const admin = await requireFounderAccount();
  const secret = generateTotpSecret();
  const uri = totpAuthUri(secret, admin.name as string, "ZINDO Admin");
  const qrDataUrl = await generateQrDataUrl(uri);
  return { secret, qrDataUrl };
}

export type ConfirmEnrollmentResult = { error: string } | { backupCodes: string[] };

export async function confirmAdminTotpEnrollmentAction(secret: string, code: string): Promise<ConfirmEnrollmentResult> {
  const admin = await requireFounderAccount();
  if (!verifyTotp(secret, code)) return { error: "Code invalide — vérifiez l'heure de votre téléphone et réessayez" };

  const backupCodes = generateBackupCodes();
  const { error } = await supabase
    .from("super_admins")
    .update({
      totp_secret: secret,
      totp_enabled: true,
      totp_backup_codes: await hashBackupCodes(backupCodes),
    })
    .eq("id", admin.id);
  if (error) {
    console.error("[confirmAdminTotpEnrollmentAction] Échec de l'activation :", error.message);
    return { error: "Impossible d'activer la 2FA" };
  }

  return { backupCodes };
}

export type ActionState = { error?: string; success?: string } | undefined;

export async function disableAdminTotpAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const admin = await requireFounderAccount();
  const password = String(formData.get("password") ?? "");
  if (!password) return { error: "Code d'accès requis" };

  const valid = await bcrypt.compare(password, admin.passwordHash as string);
  if (!valid) return { error: "Code d'accès incorrect" };

  const { error } = await supabase
    .from("super_admins")
    .update({ totp_enabled: false, totp_secret: null, totp_backup_codes: null })
    .eq("id", admin.id);
  if (error) {
    console.error("[disableAdminTotpAction] Échec de la désactivation :", error.message);
    return { error: "Impossible de désactiver la 2FA" };
  }

  return { success: "2FA désactivée" };
}
