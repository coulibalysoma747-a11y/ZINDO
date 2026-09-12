"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { logAction } from "@/lib/audit";
import type { OnlineOrderStatus } from "@prisma/client";

export type ActionState = { error?: string; success?: string } | undefined;

const slugSchema = z
  .string()
  .min(3, "3 caractères minimum")
  .max(40, "40 caractères maximum")
  .regex(/^[a-z0-9-]+$/, "Uniquement des minuscules, chiffres et tirets (ex : quincaillerie-some)");

const storeSchema = z.object({
  slug: slugSchema,
  storeName: z.string().min(1, "Le nom de la boutique est requis"),
  description: z.string().optional(),
  contactPhone: z.string().optional(),
  locationId: z.string().optional(),
  deliveryEnabled: z.coerce.boolean(),
  deliveryFee: z.coerce.number().min(0).default(0),
  freeDeliveryAbove: z.coerce.number().min(0).optional(),
  published: z.coerce.boolean(),
});

export async function saveOnlineStoreAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requirePermission(PERMISSIONS.SETTINGS_MANAGE);

  const parsed = storeSchema.safeParse({
    slug: (formData.get("slug") as string)?.trim().toLowerCase(),
    storeName: formData.get("storeName"),
    description: formData.get("description") || undefined,
    contactPhone: formData.get("contactPhone") || undefined,
    locationId: formData.get("locationId") || undefined,
    deliveryEnabled: formData.get("deliveryEnabled") === "on",
    deliveryFee: formData.get("deliveryFee") || 0,
    freeDeliveryAbove: formData.get("freeDeliveryAbove") || undefined,
    published: formData.get("published") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  if (parsed.data.published && !parsed.data.locationId) {
    return { error: "Choisissez la boutique/dépôt qui servira les commandes avant de publier" };
  }

  const slugTaken = await prisma.onlineStore.findFirst({
    where: { slug: parsed.data.slug, businessId: { not: user.businessId } },
  });
  if (slugTaken) return { error: "Cette adresse est déjà utilisée par un autre commerce, choisissez-en une autre" };

  if (parsed.data.locationId) {
    const location = await prisma.location.findFirst({
      where: { id: parsed.data.locationId, businessId: user.businessId },
    });
    if (!location) return { error: "Boutique/dépôt introuvable" };
  }

  await prisma.onlineStore.upsert({
    where: { businessId: user.businessId },
    update: parsed.data,
    create: { ...parsed.data, businessId: user.businessId },
  });

  await logAction({
    businessId: user.businessId,
    userId: user.id,
    action: "UPDATE",
    entity: "OnlineStore",
    details: parsed.data.published ? "Publiée" : "Enregistrée (non publiée)",
  });

  revalidatePath("/boutique-en-ligne");
  return { success: "Boutique en ligne enregistrée" };
}

export async function updateOnlineOrderStatusAction(
  orderId: string,
  status: OnlineOrderStatus,
  merchantNote?: string
) {
  const user = await requirePermission(PERMISSIONS.SALES_VIEW);

  const order = await prisma.onlineOrder.findFirst({
    where: { id: orderId, store: { businessId: user.businessId } },
  });
  if (!order) return { error: "Commande introuvable" };

  await prisma.onlineOrder.update({
    where: { id: orderId },
    data: { status, merchantNote: merchantNote ?? order.merchantNote },
  });

  await logAction({
    businessId: user.businessId,
    userId: user.id,
    action: "UPDATE",
    entity: "OnlineOrder",
    entityId: orderId,
    details: status,
  });

  revalidatePath("/boutique-en-ligne/commandes");
  return { success: "Commande mise à jour" };
}
