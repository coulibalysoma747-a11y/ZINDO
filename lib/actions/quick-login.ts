"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
  type RegistrationResponseJSON,
} from "@simplewebauthn/server";
import { supabase } from "@/lib/supabase";
import { requireUser } from "@/lib/auth";
import { createSession } from "@/lib/session";
import {
  PIN_LOCK_MINUTES,
  base64UrlToBytes,
  bytesToBase64Url,
  clearPasskeyHint,
  getRelyingParty,
  hashPin,
  isQuickLoginEnabled,
  setPasskeyHint,
  storeChallenge,
  takeChallenge,
  trustThisDevice,
  untrustThisDevice,
  validatePinFormat,
  verifyPin,
} from "@/lib/quick-login";

export type QuickLoginState = { error?: string; success?: string } | undefined;

const NOT_READY =
  "La connexion rapide n'est pas encore prête : la mise à jour de la base de données reste à faire.";
const NOT_ENABLED = "La connexion rapide n'est pas activée pour votre commerce.";

function isMissingSchema(message: string | undefined) {
  return Boolean(message && /pin_hash|pin_failed|trusted_devices|passkeys|does not exist|schema cache/i.test(message));
}

// --------------------------------------------------------------------------
// Code PIN
// --------------------------------------------------------------------------

export async function setPinAction(_prev: QuickLoginState, formData: FormData): Promise<QuickLoginState> {
  const user = await requireUser();
  if (!(await isQuickLoginEnabled(user.businessId))) return { error: NOT_ENABLED };

  const currentPassword = String(formData.get("currentPassword") ?? "");
  const pin = String(formData.get("pin") ?? "");
  const pinConfirm = String(formData.get("pinConfirm") ?? "");

  if (user.totpEnabled) {
    return { error: "Le PIN n'est pas disponible avec la double authentification (2FA). Utilisez Face ID ou votre mot de passe." };
  }
  const formatError = validatePinFormat(pin);
  if (formatError) return { error: formatError };
  if (pin !== pinConfirm) return { error: "Les deux PIN ne sont pas identiques." };
  if (!(await bcrypt.compare(currentPassword, user.passwordHash))) return { error: "Mot de passe incorrect." };

  const { error } = await supabase
    .from("users")
    .update({ pin_hash: await hashPin(pin), pin_failed_attempts: 0, pin_failed_at: null })
    .eq("id", user.id);
  if (error) {
    console.error("[setPinAction] Échec :", error.message);
    return { error: isMissingSchema(error.message) ? NOT_READY : "Impossible d'enregistrer le PIN." };
  }
  if (!(await trustThisDevice(user.id))) return { error: NOT_READY };

  revalidatePath("/profil");
  return { success: "PIN enregistré. Il fonctionne maintenant sur cet appareil." };
}

export async function removePinAction(): Promise<QuickLoginState> {
  const user = await requireUser();
  const { error } = await supabase
    .from("users")
    .update({ pin_hash: null, pin_failed_attempts: 0, pin_failed_at: null })
    .eq("id", user.id);
  if (error) return { error: "Impossible de supprimer le PIN." };
  await supabase.from("trusted_devices").delete().eq("user_id", user.id);
  revalidatePath("/profil");
  return { success: "PIN supprimé sur tous vos appareils." };
}

/** Active le PIN déjà créé sur un autre appareil, sans le changer. */
export async function trustDeviceAction(): Promise<QuickLoginState> {
  const user = await requireUser();
  if (!(await isQuickLoginEnabled(user.businessId))) return { error: NOT_ENABLED };
  const { data } = await supabase.from("users").select("pin_hash").eq("id", user.id).maybeSingle();
  if (!data?.pin_hash) return { error: "Créez d'abord votre PIN." };
  if (!(await trustThisDevice(user.id))) return { error: NOT_READY };
  revalidatePath("/profil");
  return { success: "Le PIN fonctionne maintenant sur cet appareil." };
}

export async function untrustDeviceAction(): Promise<QuickLoginState> {
  const user = await requireUser();
  await untrustThisDevice(user.id);
  revalidatePath("/profil");
  return { success: "Le PIN est désactivé sur cet appareil." };
}

/** Connexion par PIN depuis la page de connexion (sur un appareil de confiance). */
export async function pinLoginAction(_prev: QuickLoginState, formData: FormData): Promise<QuickLoginState> {
  const userId = String(formData.get("userId") ?? "");
  const pin = String(formData.get("pin") ?? "");
  if (!userId) return { error: "Choisissez votre nom." };

  const result = await verifyPin(userId, pin);
  if (!result.ok) {
    if (result.reason === "locked") {
      return { error: `Trop de PIN faux. Réessayez dans ${PIN_LOCK_MINUTES} minutes ou utilisez votre mot de passe.` };
    }
    if (result.reason === "unavailable") return { error: "Le PIN n'est pas disponible. Utilisez votre mot de passe." };
    return { error: "PIN incorrect." };
  }
  await createSession({ userId: result.userId, businessId: result.businessId, role: result.role });
  redirect("/dashboard");
}

// --------------------------------------------------------------------------
// Face ID / empreinte (clés d'accès)
// --------------------------------------------------------------------------

export async function passkeyRegisterOptionsAction(): Promise<
  { options: PublicKeyCredentialCreationOptionsJSON } | { error: string }
> {
  const user = await requireUser();
  if (!(await isQuickLoginEnabled(user.businessId))) return { error: NOT_ENABLED };
  const { rpID, rpName } = await getRelyingParty();

  const { data: existing, error } = await supabase.from("passkeys").select("credentialId:credential_id").eq("user_id", user.id);
  if (error) return { error: isMissingSchema(error.message) ? NOT_READY : "Impossible de préparer Face ID." };

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userName: user.email ?? user.phone,
    userDisplayName: `${user.firstName} ${user.lastName}`,
    userID: new TextEncoder().encode(user.id),
    attestationType: "none",
    excludeCredentials: (existing ?? []).map((p) => ({ id: p.credentialId as string })),
    authenticatorSelection: { residentKey: "required", userVerification: "required" },
  });
  await storeChallenge({ challenge: options.challenge, kind: "reg", userId: user.id });
  return { options };
}

export async function passkeyRegisterVerifyAction(
  response: RegistrationResponseJSON,
  label: string
): Promise<QuickLoginState> {
  const user = await requireUser();
  if (!(await isQuickLoginEnabled(user.businessId))) return { error: NOT_ENABLED };
  const stored = await takeChallenge("reg");
  if (!stored || stored.userId !== user.id) return { error: "La demande a expiré. Recommencez." };
  const { rpID, origin } = await getRelyingParty();

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: stored.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
    });
  } catch (e) {
    console.error("[passkeyRegisterVerifyAction] Vérification refusée :", e instanceof Error ? e.message : e);
    return { error: "Face ID n'a pas pu être enregistré. Recommencez." };
  }
  if (!verification.verified || !verification.registrationInfo) return { error: "Face ID n'a pas pu être enregistré." };

  const { credential } = verification.registrationInfo;
  const { error } = await supabase.from("passkeys").insert({
    user_id: user.id,
    credential_id: credential.id,
    public_key: bytesToBase64Url(credential.publicKey),
    counter: credential.counter,
    transports: credential.transports ? JSON.stringify(credential.transports) : null,
    label: label.trim().slice(0, 60) || "Cet appareil",
  });
  if (error) {
    console.error("[passkeyRegisterVerifyAction] Échec de l'enregistrement :", error.message);
    return { error: isMissingSchema(error.message) ? NOT_READY : "Impossible d'enregistrer Face ID." };
  }
  await setPasskeyHint();
  revalidatePath("/profil");
  return { success: "Face ID / empreinte enregistré sur cet appareil." };
}

export async function removePasskeyAction(passkeyId: string): Promise<QuickLoginState> {
  const user = await requireUser();
  const { error } = await supabase.from("passkeys").delete().eq("id", passkeyId).eq("user_id", user.id);
  if (error) return { error: "Impossible de supprimer cette clé." };
  const { data: left } = await supabase.from("passkeys").select("id").eq("user_id", user.id).limit(1);
  if (!left || left.length === 0) await clearPasskeyHint();
  revalidatePath("/profil");
  return { success: "Clé supprimée." };
}

export async function passkeyLoginOptionsAction(): Promise<
  { options: PublicKeyCredentialRequestOptionsJSON } | { error: string }
> {
  try {
    const { rpID } = await getRelyingParty();
    const options = await generateAuthenticationOptions({ rpID, userVerification: "required" });
    await storeChallenge({ challenge: options.challenge, kind: "auth" });
    return { options };
  } catch (e) {
    console.error("[passkeyLoginOptionsAction] Échec :", e instanceof Error ? e.message : e);
    return { error: "Face ID n'est pas disponible ici. Utilisez votre mot de passe." };
  }
}

/** Vérifie la signature de l'appareil ; en cas de succès la session est ouverte (le client redirige ensuite). */
export async function passkeyLoginVerifyAction(
  response: AuthenticationResponseJSON
): Promise<{ ok: true } | { ok: false; error: string }> {
  const fail = { ok: false as const, error: "Face ID n'a pas fonctionné. Utilisez votre mot de passe." };
  const stored = await takeChallenge("auth");
  if (!stored) return { ok: false, error: "La demande a expiré. Recommencez." };

  const { data: key } = await supabase
    .from("passkeys")
    .select("id, userId:user_id, publicKey:public_key, counter, transports")
    .eq("credential_id", response.id)
    .maybeSingle();
  if (!key) return fail;

  const { data: user } = await supabase
    .from("users")
    .select("id, businessId:business_id, role, active")
    .eq("id", key.userId as string)
    .maybeSingle();
  if (!user || !user.active || !(await isQuickLoginEnabled(user.businessId as string))) return fail;

  const { rpID, origin } = await getRelyingParty();
  try {
    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: stored.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
      credential: {
        id: response.id,
        publicKey: base64UrlToBytes(key.publicKey as string),
        counter: Number(key.counter ?? 0),
        transports: key.transports ? JSON.parse(key.transports as string) : undefined,
      },
    });
    if (!verification.verified) return fail;
    await supabase
      .from("passkeys")
      .update({ counter: verification.authenticationInfo.newCounter, last_used_at: new Date().toISOString() })
      .eq("id", key.id as string);
  } catch (e) {
    console.error("[passkeyLoginVerifyAction] Vérification refusée :", e instanceof Error ? e.message : e);
    return fail;
  }

  await createSession({ userId: user.id as string, businessId: user.businessId as string, role: user.role as string });
  return { ok: true };
}
