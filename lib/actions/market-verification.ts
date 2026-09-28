"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { requireUser } from "@/lib/auth";
import { requireSuperAdmin } from "@/lib/superadmin-auth";
import { logAction } from "@/lib/audit";
import { logAdminAction } from "@/lib/admin-audit";

/**
 * Pack Vérifié du Marché ZINDO (tables : migrations 2026-09-23_market_*.sql).
 * 1 000 FCFA / mois, séparé de l'abonnement ZINDO : badge « Vérifié » + mise
 * « À la une » tant que pack_paid_until est dans le futur. Les pièces
 * d'identité vont dans le bucket PRIVÉ "verifications" : jamais d'URL publique.
 */
const BUCKET = "verifications";
const PACK_DAYS = 30;
const DIRECT_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const PHOTO_LABELS = { idFront: "recto", idBack: "verso", selfie: "selfie" } as const;

/**
 * Adresse d'envoi signée pour qu'une photo de vérification parte directement
 * du téléphone vers le bucket PRIVÉ, en pleine qualité, sans la limite de
 * ~4,5 Mo par requête de Vercel. Le chemin reste dans le dossier du commerce.
 */
export async function createVerificationUploadAction(field: string, contentType: string): Promise<{ signedUrl: string; path: string } | { error: string }> {
  const user = await requireUser();
  if (user.role !== "ADMIN") return { error: "Seul le propriétaire du compte peut demander la vérification." };
  const label = PHOTO_LABELS[field as keyof typeof PHOTO_LABELS];
  const ext = DIRECT_TYPES[contentType];
  if (!label || !ext) return { error: "Format non pris en charge" };
  const path = `${user.businessId}/${randomUUID()}-${label}.${ext}`;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) return { error: "Échec de la préparation de l'envoi" };
  return { signedUrl: data.signedUrl, path };
}

/** Chemin d'une photo déjà envoyée directement, seulement s'il est bien dans le dossier de ce commerce. */
function directPhotoPath(formData: FormData, field: keyof typeof PHOTO_LABELS, businessId: string): string | null {
  const value = formData.get(`${field}Path`);
  if (typeof value !== "string") return null;
  const escaped = businessId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`^${escaped}/[0-9a-f-]{36}-${PHOTO_LABELS[field]}\\.(jpg|png|webp)$`);
  return pattern.test(value) ? value : null;
}

function extendPack(currentEnd: string | null): string {
  const base = Math.max(Date.now(), currentEnd ? new Date(currentEnd).getTime() : 0);
  return new Date(base + PACK_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

function readReference(formData: FormData): string | null {
  const ref = String(formData.get("paymentReference") ?? "").trim();
  return ref.length >= 4 ? ref : null;
}

export type VerificationState = { error?: string; success?: string } | undefined;

async function uploadPrivate(businessId: string, file: File, label: string): Promise<string> {
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${businessId}/${randomUUID()}-${label}.${ext}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false });
  if (error) throw new Error(error.message);
  return path;
}

export async function submitVerificationAction(_prev: VerificationState, formData: FormData): Promise<VerificationState> {
  const user = await requireUser();
  if (user.role !== "ADMIN") return { error: "Seul le propriétaire du compte peut demander la vérification." };
  const paymentReference = readReference(formData);
  if (!paymentReference) return { error: "Indiquez la référence de votre paiement de 1 000 FCFA." };

  // Chaque photo arrive soit déjà envoyée directement (chemin), soit en fichier (repli).
  const fields = ["idFront", "idBack", "selfie"] as const;
  const direct = Object.fromEntries(fields.map((f) => [f, directPhotoPath(formData, f, user.businessId)])) as Record<(typeof fields)[number], string | null>;
  for (const field of fields) {
    if (direct[field]) continue;
    const f = formData.get(field);
    if (!(f instanceof File) || f.size === 0) {
      return { error: field === "selfie" ? "Ajoutez votre photo (selfie)." : "Ajoutez le recto et le verso de votre pièce." };
    }
    if (!f.type.startsWith("image/")) return { error: "Seules les photos sont acceptées." };
  }

  const { data: existing } = await supabase
    .from("market_verifications")
    .select("status, idFront:id_front_path, idBack:id_back_path, selfie:selfie_path")
    .eq("business_id", user.businessId)
    .maybeSingle();
  if (existing?.status === "EN_ATTENTE") return { error: "Votre demande est déjà en cours d'examen." };
  if (existing?.status === "VALIDEE") return { error: "Votre compte est déjà vérifié." };

  let paths: string[];
  try {
    paths = await Promise.all(
      fields.map((field) => direct[field] ?? uploadPrivate(user.businessId, formData.get(field) as File, PHOTO_LABELS[field]))
    );
  } catch (e) {
    console.error("[submitVerificationAction] Échec de l'envoi :", e instanceof Error ? e.message : e);
    return { error: "Impossible d'envoyer les photos. Réessayez." };
  }

  const row = {
    business_id: user.businessId,
    status: "EN_ATTENTE",
    id_front_path: paths[0],
    id_back_path: paths[1],
    selfie_path: paths[2],
    payment_reference: paymentReference,
    rejection_reason: null,
    submitted_at: new Date().toISOString(),
    reviewed_at: null,
    reviewed_by: null,
  };
  const { error } = await supabase.from("market_verifications").upsert(row, { onConflict: "business_id" });
  if (error) {
    console.error("[submitVerificationAction] Échec de l'enregistrement :", error.message);
    await supabase.storage.from(BUCKET).remove(paths);
    return { error: "Impossible d'enregistrer la demande. Réessayez." };
  }

  // Anciennes photos d'une demande refusée : supprimées, on ne garde que la dernière.
  if (existing) {
    await supabase.storage.from(BUCKET).remove([existing.idFront, existing.idBack, existing.selfie] as string[]);
  }

  await logAction({ businessId: user.businessId, userId: user.id, action: "CREATE", entity: "MarketVerification" });
  revalidatePath("/verification");
  return { success: "Demande envoyée. Notre équipe vous répond sous 48 h." };
}

/** Renouvellement mensuel : le commerçant déjà vérifié envoie seulement la référence du nouveau paiement. */
export async function submitRenewalAction(_prev: VerificationState, formData: FormData): Promise<VerificationState> {
  const user = await requireUser();
  if (user.role !== "ADMIN") return { error: "Seul le propriétaire du compte peut renouveler le pack." };
  const reference = readReference(formData);
  if (!reference) return { error: "Indiquez la référence de votre paiement de 1 000 FCFA." };

  const { data: row } = await supabase
    .from("market_verifications")
    .select("status, renewalReference:renewal_reference")
    .eq("business_id", user.businessId)
    .maybeSingle();
  if (row?.status !== "VALIDEE") return { error: "Votre compte doit d'abord être vérifié." };
  if (row.renewalReference) return { error: "Un paiement est déjà en attente de confirmation." };

  const { error } = await supabase
    .from("market_verifications")
    .update({ renewal_reference: reference, renewal_submitted_at: new Date().toISOString() })
    .eq("business_id", user.businessId);
  if (error) return { error: "Impossible d'enregistrer le paiement. Réessayez." };

  revalidatePath("/verification");
  return { success: "Paiement envoyé. Votre pack sera prolongé dès confirmation." };
}

/** Première demande : valide (pièces + paiement → pack de 30 jours) ou refuse. */
export async function reviewVerificationAction(businessId: string, approve: boolean, reason?: string) {
  const admin = await requireSuperAdmin();
  if (!approve && !reason?.trim()) return { error: "Indiquez le motif du refus." };

  const { data: row } = await supabase
    .from("market_verifications")
    .select("packPaidUntil:pack_paid_until")
    .eq("business_id", businessId)
    .maybeSingle();

  const { error } = await supabase
    .from("market_verifications")
    .update({
      status: approve ? "VALIDEE" : "REFUSEE",
      rejection_reason: approve ? null : reason!.trim(),
      reviewed_at: new Date().toISOString(),
      reviewed_by: admin.name,
      ...(approve ? { pack_paid_until: extendPack((row?.packPaidUntil as string | null) ?? null) } : {}),
    })
    .eq("business_id", businessId);
  if (error) return { error: "Impossible d'enregistrer la décision." };

  await logAdminAction({
    superAdminId: admin.id,
    actorName: admin.name,
    action: approve ? "APPROVE" : "REJECT",
    entity: "MarketVerification",
    entityId: businessId,
    details: approve ? `Vendeur vérifié, pack ${PACK_DAYS} jours` : `Refus : ${reason!.trim()}`,
  });
  revalidatePath("/admin/verifications");
  return { success: approve ? "Commerce vérifié" : "Demande refusée" };
}

/** Renouvellement : confirme le paiement (+30 jours) ou le rejette (référence introuvable…). */
export async function reviewRenewalAction(businessId: string, approve: boolean) {
  const admin = await requireSuperAdmin();
  const { data: row } = await supabase
    .from("market_verifications")
    .select("packPaidUntil:pack_paid_until, renewalReference:renewal_reference")
    .eq("business_id", businessId)
    .maybeSingle();
  if (!row?.renewalReference) return { error: "Aucun paiement en attente." };

  const { error } = await supabase
    .from("market_verifications")
    .update({
      renewal_reference: null,
      renewal_submitted_at: null,
      ...(approve
        ? { pack_paid_until: extendPack(row.packPaidUntil as string | null), payment_reference: row.renewalReference }
        : {}),
    })
    .eq("business_id", businessId);
  if (error) return { error: "Impossible d'enregistrer la décision." };

  await logAdminAction({
    superAdminId: admin.id,
    actorName: admin.name,
    action: approve ? "APPROVE" : "REJECT",
    entity: "MarketPackRenewal",
    entityId: businessId,
    details: `Référence ${row.renewalReference}`,
  });
  revalidatePath("/admin/verifications");
  return { success: approve ? "Pack prolongé de 30 jours" : "Paiement rejeté" };
}
