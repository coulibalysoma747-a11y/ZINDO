"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/superadmin-auth";
import { logAdminAction } from "@/lib/admin-audit";

export type ActionState = { error?: string; success?: string } | undefined;

const flagSchema = z.object({
  key: z
    .string()
    .min(1, "La clé est requise")
    .regex(/^[a-z0-9_]+$/, "Uniquement des minuscules, chiffres et underscores"),
  label: z.string().min(1, "Le nom est requis"),
  description: z.string().optional(),
});

export async function createFeatureFlagAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const admin = await requireSuperAdmin();
  const parsed = flagSchema.safeParse({
    key: formData.get("key"),
    label: formData.get("label"),
    description: formData.get("description") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const existing = await prisma.featureFlag.findUnique({ where: { key: parsed.data.key } });
  if (existing) return { error: "Cette clé existe déjà" };

  const flag = await prisma.featureFlag.create({ data: parsed.data });
  await logAdminAction({
    superAdminId: admin.id,
    actorName: admin.name,
    action: "CREATE",
    entity: "FeatureFlag",
    entityId: flag.id,
    details: flag.key,
  });

  revalidatePath("/admin/fonctionnalites");
  return { success: "Fonctionnalité enregistrée — désactivée pour tout le monde par défaut" };
}

export async function setFeatureFlagGlobalAction(flagId: string, enabledGlobally: boolean) {
  const admin = await requireSuperAdmin();
  const flag = await prisma.featureFlag.update({ where: { id: flagId }, data: { enabledGlobally } });
  await logAdminAction({
    superAdminId: admin.id,
    actorName: admin.name,
    action: enabledGlobally ? "ENABLE_ALL" : "DISABLE_ALL",
    entity: "FeatureFlag",
    entityId: flagId,
    details: flag.key,
  });
  revalidatePath("/admin/fonctionnalites");
  return { success: enabledGlobally ? "Activée pour tous les commerçants" : "Désactivée globalement" };
}

export async function setFeatureFlagBusinessAction(flagId: string, businessId: string, enabled: boolean) {
  const admin = await requireSuperAdmin();
  await prisma.featureFlagBusiness.upsert({
    where: { featureFlagId_businessId: { featureFlagId: flagId, businessId } },
    update: { enabled },
    create: { featureFlagId: flagId, businessId, enabled },
  });
  await logAdminAction({
    superAdminId: admin.id,
    actorName: admin.name,
    action: "SET",
    entity: "FeatureFlagBusiness",
    entityId: businessId,
    details: `${flagId} -> ${enabled}`,
  });
  revalidatePath("/admin/fonctionnalites");
  return { success: "Mis à jour pour ce commerce" };
}

export async function deleteFeatureFlagAction(flagId: string) {
  const admin = await requireSuperAdmin();
  const flag = await prisma.featureFlag.delete({ where: { id: flagId } });
  await logAdminAction({
    superAdminId: admin.id,
    actorName: admin.name,
    action: "DELETE",
    entity: "FeatureFlag",
    entityId: flagId,
    details: flag.key,
  });
  revalidatePath("/admin/fonctionnalites");
  return { success: "Fonctionnalité supprimée" };
}
