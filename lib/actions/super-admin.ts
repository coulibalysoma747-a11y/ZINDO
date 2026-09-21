"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { requireSuperAdmin, requireFounder } from "@/lib/superadmin-auth";
import { logAdminAction } from "@/lib/admin-audit";
import type { Role } from "@/lib/db-types";

export type ActionState = { error?: string; success?: string } | undefined;

export type DeleteBusinessResult = { success?: string; error?: string };

/**
 * Réservé au fondateur : suppression définitive d'un commerce et de toutes
 * ses données (cascade via les FK `on delete cascade` déjà en place sur
 * chaque table liée à businesses(id)). Reconfirmation par mot de passe
 * obligatoire, même logique que deleteAdminAction (lib/actions/admin-management.ts).
 */
export async function deleteBusinessAction(
  businessId: string,
  currentPassword: string
): Promise<DeleteBusinessResult> {
  const founder = await requireFounder();

  const valid = await bcrypt.compare(currentPassword, founder.passwordHash);
  if (!valid) return { error: "Mot de passe incorrect" };

  const { data: target } = await supabase.from("businesses").select("id, name").eq("id", businessId).maybeSingle();
  if (!target) return { error: "Commerce introuvable" };

  const { error } = await supabase.from("businesses").delete().eq("id", businessId);
  if (error) {
    console.error("[deleteBusinessAction] Échec de la suppression :", error.message);
    const isForeignKeyError = /foreign key|violates/.test(error.message.toLowerCase());
    return {
      error: isForeignKeyError
        ? "Impossible de supprimer : des données liées bloquent encore la suppression"
        : "Impossible de supprimer ce commerce",
    };
  }

  await logAdminAction({
    superAdminId: founder.id,
    actorName: founder.name,
    action: "DELETE",
    entity: "Business",
    entityId: businessId,
    details: target.name as string,
  });

  revalidatePath("/admin/commercants");
  return { success: "Commerce supprimé" };
}

export async function toggleBusinessSuspendedAction(businessId: string, suspended: boolean) {
  const admin = await requireSuperAdmin();
  const { data: business, error } = await supabase
    .from("businesses")
    .update({ suspended })
    .eq("id", businessId)
    .select("name")
    .single();
  if (error || !business) {
    console.error("[toggleBusinessSuspendedAction] Échec de la mise à jour :", error?.message);
    return { error: "Impossible de mettre à jour le commerce" };
  }
  await logAdminAction({
    superAdminId: admin.id,
    actorName: admin.name,
    action: suspended ? "SUSPEND" : "REACTIVATE",
    entity: "Business",
    entityId: businessId,
    details: business.name as string,
  });
  revalidatePath("/admin/commercants");
  revalidatePath(`/admin/commercants/${businessId}`);
  return { success: suspended ? "Commerce suspendu" : "Commerce réactivé" };
}

export async function toggleUserActiveAction(userId: string, active: boolean) {
  const admin = await requireSuperAdmin();
  const { data: user, error } = await supabase
    .from("users")
    .update({ active })
    .eq("id", userId)
    .select("firstName:first_name, lastName:last_name")
    .single();
  if (error || !user) {
    console.error("[toggleUserActiveAction] Échec de la mise à jour :", error?.message);
    return { error: "Impossible de mettre à jour l'utilisateur" };
  }
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
  const { data: user, error } = await supabase
    .from("users")
    .update({ role })
    .eq("id", userId)
    .select("firstName:first_name, lastName:last_name, businessId:business_id")
    .single();
  if (error || !user) {
    console.error("[updateUserRoleAction] Échec de la mise à jour :", error?.message);
    return { error: "Impossible de mettre à jour le rôle" };
  }
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

  const { data: user } = await supabase
    .from("users")
    .select("firstName:first_name, lastName:last_name, businessId:business_id")
    .eq("id", userId)
    .maybeSingle();
  if (!user) return { error: "Utilisateur introuvable" };

  const passwordHash = await bcrypt.hash(newPassword, 10);
  const { error } = await supabase.from("users").update({ password_hash: passwordHash }).eq("id", userId);
  if (error) {
    console.error("[resetUserPasswordAction] Échec de la réinitialisation :", error.message);
    return { error: "Impossible de réinitialiser le mot de passe" };
  }

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
  const { error } = await supabase
    .from("global_role_permissions")
    .upsert({ role, permission, allowed }, { onConflict: "role,permission", ignoreDuplicates: false });
  if (error) {
    console.error("[setGlobalPermissionAction] Échec de la mise à jour :", error.message);
    return { error: "Impossible de mettre à jour la permission par défaut" };
  }
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
  const { error } = await supabase.from("global_role_permissions").delete().eq("role", role);
  if (error) {
    console.error("[resetGlobalPermissionsAction] Échec de la réinitialisation :", error.message);
    return { error: "Impossible de réinitialiser les permissions par défaut" };
  }
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
  const { data: user } = await supabase.from("users").select("businessId:business_id").eq("id", userId).maybeSingle();
  if (!user) return { error: "Utilisateur introuvable" };

  const { error } = await supabase
    .from("user_permissions")
    .upsert({ user_id: userId, permission, allowed }, { onConflict: "user_id,permission", ignoreDuplicates: false });
  if (error) {
    console.error("[setUserPermissionAction] Échec de la mise à jour :", error.message);
    return { error: "Impossible de mettre à jour ce module" };
  }

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
  const { data: user } = await supabase.from("users").select("businessId:business_id").eq("id", userId).maybeSingle();
  if (!user) return { error: "Utilisateur introuvable" };

  const { error } = await supabase.from("user_permissions").delete().eq("user_id", userId);
  if (error) {
    console.error("[resetUserPermissionsAction] Échec de la réinitialisation :", error.message);
    return { error: "Impossible de réinitialiser les dérogations" };
  }

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
