"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission, requireUser } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { logAction } from "@/lib/audit";
import { saveBusinessLogo, deleteUploadedImage } from "@/lib/photo-upload";
import type { PaymentMethod, Role } from "@prisma/client";

export type ActionState = { error?: string; success?: string } | undefined;

const businessSchema = z.object({
  name: z.string().min(1, "Nom requis"),
  phone: z.string().optional(),
  email: z.string().email("E-mail invalide").optional().or(z.literal("")),
  address: z.string().optional(),
  city: z.string().optional(),
  currency: z.string().min(1),
  ticketWidth: z.enum(["58mm", "80mm", "A4"]),
  ticketFooter: z.string().optional(),
  qrCodeSize: z.coerce.number().int().min(0),
  defaultMinStock: z.coerce.number().int().min(0),
});

export async function updateBusinessSettingsAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  const parsed = businessSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone") || undefined,
    email: formData.get("email") || "",
    address: formData.get("address") || undefined,
    city: formData.get("city") || undefined,
    currency: formData.get("currency"),
    ticketWidth: formData.get("ticketWidth"),
    ticketFooter: formData.get("ticketFooter") || undefined,
    qrCodeSize: formData.get("qrCodeSize") || 0,
    defaultMinStock: formData.get("defaultMinStock"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  let logoUrl: string | null | undefined;
  const logoFile = formData.get("logo");
  const removeLogo = formData.get("removeLogo") === "true";
  if (logoFile instanceof File && logoFile.size > 0) {
    const result = await saveBusinessLogo(logoFile);
    if ("error" in result) return { error: result.error };
    logoUrl = result.url;
    await deleteUploadedImage(user.business.logoUrl);
  } else if (removeLogo) {
    logoUrl = null;
    await deleteUploadedImage(user.business.logoUrl);
  }

  await prisma.business.update({
    where: { id: user.businessId },
    data: {
      ...parsed.data,
      email: parsed.data.email || undefined,
      ...(logoUrl !== undefined ? { logoUrl } : {}),
    },
  });

  await logAction({
    businessId: user.businessId,
    userId: user.id,
    action: "UPDATE",
    entity: "Business",
    entityId: user.businessId,
  });

  revalidatePath("/parametres");
  return { success: "Paramètres enregistrés" };
}

export async function togglePaymentMethodAction(method: PaymentMethod, enabled: boolean) {
  const user = await requirePermission(PERMISSIONS.SETTINGS_MANAGE);

  await prisma.paymentMethodConfig.upsert({
    where: { businessId_method: { businessId: user.businessId, method } },
    update: { enabled },
    create: { businessId: user.businessId, method, label: method, enabled },
  });

  revalidatePath("/parametres");
  return { success: "Moyen de paiement mis à jour" };
}

export async function togglePermissionAction(role: Role, permission: string, allowed: boolean) {
  const user = await requirePermission(PERMISSIONS.SETTINGS_MANAGE);

  await prisma.rolePermission.upsert({
    where: { businessId_role_permission: { businessId: user.businessId, role, permission } },
    update: { allowed },
    create: { businessId: user.businessId, role, permission, allowed },
  });

  revalidatePath("/parametres");
  return { success: "Permission mise à jour" };
}

export async function resetRolePermissionsAction(role: Role) {
  const user = await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  await prisma.rolePermission.deleteMany({ where: { businessId: user.businessId, role } });
  revalidatePath("/parametres");
  return { success: "Permissions réinitialisées" };
}

const profileSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email("E-mail invalide").optional().or(z.literal("")),
});

export async function updateProfileAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email") || "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  await prisma.user.update({
    where: { id: user.id },
    data: { ...parsed.data, email: parsed.data.email || undefined },
  });

  revalidatePath("/profil");
  return { success: "Profil mis à jour" };
}

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Mot de passe actuel requis"),
    newPassword: z.string().min(6, "6 caractères minimum"),
  });

export async function changePasswordAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = passwordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const valid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!valid) return { error: "Mot de passe actuel incorrect" };

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

  return { success: "Mot de passe modifié" };
}
