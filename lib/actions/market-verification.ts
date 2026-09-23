"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { requireUser } from "@/lib/auth";
import { requireSuperAdmin } from "@/lib/superadmin-auth";
import { logAction } from "@/lib/audit";
import { logAdminAction } from "@/lib/admin-audit";
import { registerFeatureFlag } from "@/lib/feature-flags";

/**
 * Vérification des vendeurs du Marché ZINDO (table market_verifications,
 * migration 2026-09-23_market_verifications.sql). Les pièces d'identité vont
 * dans le bucket PRIVÉ "verifications" : jamais d'URL publique.
 */
const BUCKET = "verifications";
const VERIFIED_FLAG = "marche_verifie";
const MAX_BYTES = 8 * 1024 * 1024;

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

export async function reviewVerificationAction(businessId: string, approve: boolean, reason?: string) {
  const admin = await requireSuperAdmin();
  if (!approve && !reason?.trim()) return { error: "Indiquez le motif du refus." };

  const { error } = await supabase
    .from("market_verifications")
    .update({
      status: approve ? "VALIDEE" : "REFUSEE",
      rejection_reason: approve ? null : reason!.trim(),
      reviewed_at: new Date().toISOString(),
      reviewed_by: admin.name,
    })
    .eq("business_id", businessId);
  if (error) return { error: "Impossible d'enregistrer la décision." };

  await registerFeatureFlag(
    VERIFIED_FLAG,
    "Marché : commerce vérifié",
    "À activer PAR COMMERCE après vérification : badge « Vérifié » sur le marché, et mise « À la une » si son abonnement est payé."
  );
  const { data: flag } = await supabase.from("feature_flags").select("id").eq("key", VERIFIED_FLAG).maybeSingle();
  if (flag) {
    await supabase
      .from("feature_flag_businesses")
      .upsert(
        { feature_flag_id: flag.id, business_id: businessId, enabled: approve },
        { onConflict: "feature_flag_id,business_id", ignoreDuplicates: false }
      );
  }

  await logAdminAction({
    superAdminId: admin.id,
    actorName: admin.name,
    action: approve ? "APPROVE" : "REJECT",
    entity: "MarketVerification",
    entityId: businessId,
    details: approve ? "Vendeur vérifié" : `Refus : ${reason!.trim()}`,
  });
  revalidatePath("/admin/verifications");
  return { success: approve ? "Commerce vérifié" : "Demande refusée" };
}
