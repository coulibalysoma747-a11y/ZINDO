"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserAllowingActivitySetup, hasPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { ACTIVITIES } from "@/lib/activities";
import { getActivityConfig } from "@/lib/activity-config";
import { logAction } from "@/lib/audit";

export type ActionState = { error?: string } | undefined;

export async function setBusinessActivityAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUserAllowingActivitySetup();

  const activityKey = String(formData.get("activityKey") ?? "");
  const activity = ACTIVITIES.find((a) => a.key === activityKey);
  if (!activity) return { error: "Choisissez une activité valide" };

  const isChange = !!user.business.activityKey;
  if (isChange) {
    const allowed = await hasPermission(user.businessId, user.role, PERMISSIONS.SETTINGS_MANAGE, user.id);
    if (!allowed) return { error: "Seul un administrateur peut modifier l'activité du commerce" };
  }

  await prisma.business.update({
    where: { id: user.businessId },
    data: { activityKey: activity.key, activity: activity.label },
  });

  const config = await getActivityConfig(activity.key);
  if (config.defaultCategories.length > 0) {
    const existing = await prisma.category.findMany({
      where: { businessId: user.businessId, name: { in: config.defaultCategories } },
      select: { name: true },
    });
    const existingNames = new Set(existing.map((c) => c.name));
    const toCreate = config.defaultCategories.filter((name) => !existingNames.has(name));
    if (toCreate.length > 0) {
      await prisma.category.createMany({
        data: toCreate.map((name) => ({ businessId: user.businessId, name })),
      });
    }
  }

  await logAction({
    businessId: user.businessId,
    userId: user.id,
    action: isChange ? "UPDATE" : "CREATE",
    entity: "BusinessActivity",
    details: activity.label,
  });

  revalidatePath("/dashboard");
  revalidatePath("/parametres");
  revalidatePath("/categories");
  redirect("/dashboard");
}
