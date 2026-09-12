"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { logAction } from "@/lib/audit";
import { checkLimit } from "@/lib/subscription";

export type ActionState = { error?: string; success?: string } | undefined;

const locationSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  type: z.enum(["BOUTIQUE", "DEPOT"]),
  address: z.string().optional(),
  city: z.string().optional(),
});

function parse(formData: FormData) {
  return locationSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
    address: formData.get("address") || undefined,
    city: formData.get("city") || undefined,
  });
}

export async function createLocationAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requirePermission(PERMISSIONS.LOCATIONS_MANAGE);
  const parsed = parse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const limit = await checkLimit(user.businessId, "locations");
  if (!limit.ok) {
    return {
      error: `Limite de votre abonnement atteinte (${limit.current}/${limit.limit} boutiques) — passez à un palier supérieur pour en ajouter davantage.`,
    };
  }

  const existing = await prisma.location.findFirst({
    where: { businessId: user.businessId, name: parsed.data.name },
  });
  if (existing) return { error: "Une boutique porte déjà ce nom" };

  const location = await prisma.location.create({
    data: { businessId: user.businessId, ...parsed.data },
  });

  await logAction({
    businessId: user.businessId,
    userId: user.id,
    action: "CREATE",
    entity: "Location",
    entityId: location.id,
  });

  revalidatePath("/boutiques");
  return { success: "Boutique créée" };
}

export async function updateLocationAction(
  id: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requirePermission(PERMISSIONS.LOCATIONS_MANAGE);
  const parsed = parse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const location = await prisma.location.findFirst({ where: { id, businessId: user.businessId } });
  if (!location) return { error: "Boutique introuvable" };

  await prisma.location.update({ where: { id }, data: parsed.data });

  revalidatePath("/boutiques");
  return { success: "Boutique mise à jour" };
}

export async function setDefaultLocationAction(id: string) {
  const user = await requirePermission(PERMISSIONS.LOCATIONS_MANAGE);
  const location = await prisma.location.findFirst({ where: { id, businessId: user.businessId } });
  if (!location) return { error: "Boutique introuvable" };

  await prisma.$transaction([
    prisma.location.updateMany({ where: { businessId: user.businessId }, data: { isDefault: false } }),
    prisma.location.update({ where: { id }, data: { isDefault: true } }),
  ]);

  revalidatePath("/boutiques");
  return { success: "Boutique par défaut mise à jour" };
}

export async function toggleLocationActiveAction(id: string, active: boolean) {
  const user = await requirePermission(PERMISSIONS.LOCATIONS_MANAGE);
  const location = await prisma.location.findFirst({ where: { id, businessId: user.businessId } });
  if (!location) return { error: "Boutique introuvable" };
  if (location.isDefault && !active) {
    return { error: "Impossible de désactiver la boutique par défaut" };
  }

  const activeCount = await prisma.location.count({ where: { businessId: user.businessId, active: true } });
  if (!active && activeCount <= 1) {
    return { error: "Le commerce doit conserver au moins une boutique active" };
  }

  await prisma.location.update({ where: { id }, data: { active } });
  revalidatePath("/boutiques");
  return { success: active ? "Boutique réactivée" : "Boutique désactivée" };
}
