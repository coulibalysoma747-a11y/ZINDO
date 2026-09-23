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
const MAX_BYTES = 8 * 1024 * 1024;
const PACK_DAYS = 30;

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

  const files = {
    front: formData.get("idFront"),
    back: formData.get("idBack"),
    selfie: formData.get("selfie"),
  };
  for (const [label, f] of Object.entries(files)) {
    if (!(f instanceof File) || f.size === 0) {
      return { error: label === "selfie" ? "Ajoutez votre photo (selfie)." : "Ajoutez le recto et le verso de votre pièce." };
    }
    if (!f.type.startsWith("image/")) return { error: "Seules les photos sont acceptées." };
    if (f.size > MAX_BYTES) return { error: "Une photo dépasse 8 Mo : reprenez-la en qualité normale." };
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
    paths = await Promise.all([
      uploadPrivate(user.businessId, files.front as File, "recto"),
      uploadPrivate(user.businessId, files.back as File, "verso"),
      uploadPrivate(user.businessId, files.selfie as File, "selfie"),
    ]);
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
