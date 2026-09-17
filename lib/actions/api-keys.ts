"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { logAction } from "@/lib/audit";

export type ApiKeySummary = {
  id: string;
  name: string;
  keyPrefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  revoked: boolean;
};

export async function listApiKeysAction(): Promise<ApiKeySummary[]> {
  const user = await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  const { data } = await supabase
    .from("api_keys")
    .select("id, name, keyPrefix:key_prefix, createdAt:created_at, lastUsedAt:last_used_at, revokedAt:revoked_at")
    .eq("business_id", user.businessId)
    .order("created_at", { ascending: false });

  return ((data ?? []) as unknown as Array<{
    id: string;
    name: string;
    keyPrefix: string;
    createdAt: string;
    lastUsedAt: string | null;
    revokedAt: string | null;
  }>).map((k) => ({
    id: k.id,
    name: k.name,
    keyPrefix: k.keyPrefix,
    createdAt: k.createdAt,
    lastUsedAt: k.lastUsedAt,
    revoked: !!k.revokedAt,
  }));
}

export type CreateApiKeyResult = { error: string } | { key: string; summary: ApiKeySummary };

export async function createApiKeyAction(name: string): Promise<CreateApiKeyResult> {
  const user = await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  const trimmedName = name.trim();
  if (!trimmedName) return { error: "Donnez un nom à cette clé (ex. « Comptabilité »)" };

  const key = `zindo_${crypto.randomBytes(24).toString("hex")}`;
  const keyPrefix = key.slice(0, 14);
  const keyHash = crypto.createHash("sha256").update(key).digest("hex");

  const { data, error } = await supabase
    .from("api_keys")
    .insert({
      business_id: user.businessId,
      name: trimmedName,
      key_prefix: keyPrefix,
      key_hash: keyHash,
    })
    .select("id, createdAt:created_at")
    .single();
  if (error || !data) {
    console.error("[createApiKeyAction] Échec de la création :", error?.message);
    return { error: "Impossible de créer la clé" };
  }

  await logAction({
    businessId: user.businessId,
    userId: user.id,
    action: "CREATE",
    entity: "ApiKey",
    entityId: data.id as string,
    details: trimmedName,
  });

  revalidatePath("/parametres");
  return {
    key,
    summary: {
      id: data.id as string,
      name: trimmedName,
      keyPrefix,
      createdAt: data.createdAt as string,
      lastUsedAt: null,
      revoked: false,
    },
  };
}

export async function revokeApiKeyAction(id: string): Promise<{ error?: string }> {
  const user = await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  const { error } = await supabase
    .from("api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id)
    .eq("business_id", user.businessId);
  if (error) {
    console.error("[revokeApiKeyAction] Échec de la révocation :", error.message);
    return { error: "Impossible de révoquer la clé" };
  }

  await logAction({
    businessId: user.businessId,
    userId: user.id,
    action: "DELETE",
    entity: "ApiKey",
    entityId: id,
  });

  revalidatePath("/parametres");
  return {};
}
