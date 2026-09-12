"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/superadmin-auth";
import { logAdminAction } from "@/lib/admin-audit";
import type { Role } from "@prisma/client";

export type ActionState = { error?: string; success?: string } | undefined;

export async function toggleBusinessSuspendedAction(businessId: string, suspended: boolean) {
  const admin = await requireSuperAdmin();
  const business = await prisma.business.update({ where: { id: businessId }, data: { suspended } });
  await logAdminAction({
    superAdminId: admin.id,
    actorName: admin.name,
    action: suspended ? "SUSPEND" : "REACTIVATE",
    entity: "Business",
    entityId: businessId,
    details: business.name,
  });
  revalidatePath("/admin/commercants");
  revalidatePath(`/admin/commercants/${businessId}`);
  return { success: suspended ? "Commerce suspendu" : "Commerce réactivé" };
}

export async function toggleUserActiveAction(userId: string, active: boolean) {
  const admin = await requireSuperAdmin();
  const user = await prisma.user.update({ where: { id: userId }, data: { active } });
  await logAdminAction({
    superAdminId: admin.id,
    actorName: admin.name,
    action: active ? "REACTIVATE" : "DEACTIVATE",
    entity: "User",
    entityId: userId,
    details: `${user.firstName} ${user.lastName}`,
  });
  revalidatePath("/admin/utilisateurs");
  revalidatePath("/admin/commercants");
  return { success: active ? "Compte réactivé" : "Compte désactivé" };
}

export async function updateUserRoleAction(userId: string, role: Role) {
  const admin = await requireSuperAdmin();
  const user = await prisma.user.update({ where: { id: userId }, data: { role } });
  await logAdminAction({
    superAdminId: admin.id,
    actorName: admin.name,
    action: "SET",
    entity: "User",
    entityId: userId,
    details: `${user.firstName} ${user.lastName} -> ${role}`,
  });
  revalidatePath("/admin/utilisateurs");
  revalidatePath(`/admin/commercants/${user.businessId}`);
  return { success: "Rôle mis à jour" };
}

export type ResetUserPasswordResult = { success?: string; error?: string };

/** Réinitialisation de mot de passe cross-commerce, pour aider un commerçant qui n'a pas d'administrateur disponible. */
export async function resetUserPasswordAction(
  userId: string,
  newPassword: string
): Promise<ResetUserPasswordResult> {
  const admin = await requireSuperAdmin();
  if (!newPassword || newPassword.length < 6) {
    return { error: "Le mot de passe doit contenir au moins 6 caractères" };
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { error: "Utilisateur introuvable" };

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });

  await logAdminAction({
    superAdminId: admin.id,
    actorName: admin.name,
    action: "RESET_PASSWORD",
    entity: "User",
    entityId: userId,
    details: `${user.firstName} ${user.lastName}`,
  });

  revalidatePath(`/admin/commercants/${user.businessId}`);
  return { success: "Mot de passe réinitialisé" };
}

export async function setGlobalPermissionAction(role: Role, permission: string, allowed: boolean) {
  const admin = await requireSuperAdmin();
  await prisma.globalRolePermission.upsert({
    where: { role_permission: { role, permission } },
    update: { allowed },
    create: { role, permission, allowed },
  });
  await logAdminAction({
    superAdminId: admin.id,
    actorName: admin.name,
    action: "SET",
    entity: "GlobalRolePermission",
    details: `${role} / ${permission} -> ${allowed}`,
  });
  revalidatePath("/admin/permissions");
  return { success: "Permission par défaut mise à jour" };
}

export async function resetGlobalPermissionsAction(role: Role) {
  const admin = await requireSuperAdmin();
  await prisma.globalRolePermission.deleteMany({ where: { role } });
  await logAdminAction({
    superAdminId: admin.id,
    actorName: admin.name,
    action: "RESET",
    entity: "GlobalRolePermission",
    details: role,
  });
  revalidatePath("/admin/permissions");
  return { success: "Permissions par défaut réinitialisées" };
}

export async function setUserPermissionAction(userId: string, permission: string, allowed: boolean) {
  const admin = await requireSuperAdmin();
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      permissionOverrides: {
        upsert: {
          where: { userId_permission: { userId, permission } },
          update: { allowed },
          create: { permission, allowed },
        },
      },
    },
  });
  await logAdminAction({
    superAdminId: admin.id,
    actorName: admin.name,
    action: "SET",
    entity: "UserPermission",
    entityId: userId,
    details: `${permission} -> ${allowed}`,
  });
  revalidatePath(`/admin/commercants/${user.businessId}`);
  revalidatePath(`/admin/commercants/${user.businessId}/utilisateurs/${userId}`);
  return { success: "Module mis à jour pour ce compte" };
}

export async function resetUserPermissionsAction(userId: string) {
  const admin = await requireSuperAdmin();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { businessId: true } });
  await prisma.userPermission.deleteMany({ where: { userId } });
  await logAdminAction({
    superAdminId: admin.id,
    actorName: admin.name,
    action: "RESET",
    entity: "UserPermission",
    entityId: userId,
  });
  revalidatePath(`/admin/commercants/${user.businessId}`);
  revalidatePath(`/admin/commercants/${user.businessId}/utilisateurs/${userId}`);
  return { success: "Dérogations réinitialisées — ce compte suit à nouveau son rôle" };
}
