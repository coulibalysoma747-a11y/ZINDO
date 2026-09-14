"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { logAction } from "@/lib/audit";
import { checkLimit } from "@/lib/subscription";

export type ActionState = { error?: string; success?: string } | undefined;

const userSchema = z.object({
  firstName: z.string().min(1, "Prénom requis"),
  lastName: z.string().min(1, "Nom requis"),
  phone: z.string().min(6, "Téléphone invalide"),
  email: z.string().email("E-mail invalide").optional().or(z.literal("")),
  password: z.string().min(6, "6 caractères minimum"),
  role: z.enum(["ADMIN", "VENDEUR", "GESTIONNAIRE_STOCK"]),
});

export async function createUserAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const admin = await requirePermission(PERMISSIONS.USERS_MANAGE);
  const parsed = userSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    phone: formData.get("phone"),
    email: formData.get("email") || "",
    password: formData.get("password"),
    role: formData.get("role"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const limit = await checkLimit(admin.businessId, "users");
  if (!limit.ok) {
    return {
      error: `Limite de votre abonnement atteinte (${limit.current}/${limit.limit} utilisateurs) — passez à un palier supérieur pour en ajouter davantage.`,
    };
  }

  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("business_id", admin.businessId)
    .eq("phone", parsed.data.phone)
    .maybeSingle();
  if (existing) return { error: "Ce numéro de téléphone est déjà utilisé" };

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const { data: user, error } = await supabase
    .from("users")
    .insert({
      business_id: admin.businessId,
      first_name: parsed.data.firstName,
      last_name: parsed.data.lastName,
      phone: parsed.data.phone,
      email: parsed.data.email || null,
      password_hash: passwordHash,
      role: parsed.data.role,
    })
    .select("id")
    .single();
  if (error || !user) {
    console.error("[createUserAction] Échec de la création :", error?.message);
    return { error: "Impossible de créer l'utilisateur" };
  }

  await logAction({
    businessId: admin.businessId,
    userId: admin.id,
    action: "CREATE",
    entity: "User",
    entityId: user.id as string,
  });

  revalidatePath("/utilisateurs");
  return { success: "Utilisateur créé" };
}

export async function toggleUserActiveAction(id: string, active: boolean) {
  const admin = await requirePermission(PERMISSIONS.USERS_MANAGE);
  if (id === admin.id) return { error: "Vous ne pouvez pas désactiver votre propre compte" };

  const { data: user } = await supabase
    .from("users")
    .select("id")
    .eq("id", id)
    .eq("business_id", admin.businessId)
    .maybeSingle();
  if (!user) return { error: "Utilisateur introuvable" };

  const { error } = await supabase.from("users").update({ active }).eq("id", id);
  if (error) {
    console.error("[toggleUserActiveAction] Échec de la mise à jour :", error.message);
    return { error: "Impossible de mettre à jour l'utilisateur" };
  }

  await logAction({
    businessId: admin.businessId,
    userId: admin.id,
    action: active ? "REACTIVATE" : "DEACTIVATE",
    entity: "User",
    entityId: id,
  });

  revalidatePath("/utilisateurs");
  return { success: active ? "Utilisateur réactivé" : "Utilisateur désactivé" };
}

export async function updateUserRoleAction(id: string, role: "ADMIN" | "VENDEUR" | "GESTIONNAIRE_STOCK") {
  const admin = await requirePermission(PERMISSIONS.USERS_MANAGE);
  const { data: user } = await supabase
    .from("users")
    .select("id")
    .eq("id", id)
    .eq("business_id", admin.businessId)
    .maybeSingle();
  if (!user) return { error: "Utilisateur introuvable" };

  const { error } = await supabase.from("users").update({ role }).eq("id", id);
  if (error) {
    console.error("[updateUserRoleAction] Échec de la mise à jour :", error.message);
    return { error: "Impossible de mettre à jour le rôle" };
  }

  revalidatePath("/utilisateurs");
  return { success: "Rôle mis à jour" };
}

/**
 * Réinitialisation de mot de passe assistée : pour un utilisateur qui a oublié
 * le sien, un administrateur du commerce lui fixe un nouveau mot de passe
 * (à lui communiquer directement) sans avoir besoin de l'ancien.
 */
export async function resetUserPasswordAction(id: string, newPassword: string) {
  const admin = await requirePermission(PERMISSIONS.USERS_MANAGE);
  if (!newPassword || newPassword.length < 6) {
    return { error: "Le mot de passe doit contenir au moins 6 caractères" };
  }

  const { data: user } = await supabase
    .from("users")
    .select("id")
    .eq("id", id)
    .eq("business_id", admin.businessId)
    .maybeSingle();
  if (!user) return { error: "Utilisateur introuvable" };

  const passwordHash = await bcrypt.hash(newPassword, 10);
  const { error } = await supabase.from("users").update({ password_hash: passwordHash }).eq("id", id);
  if (error) {
    console.error("[resetUserPasswordAction] Échec de la réinitialisation :", error.message);
    return { error: "Impossible de réinitialiser le mot de passe" };
  }

  await logAction({
    businessId: admin.businessId,
    userId: admin.id,
    action: "RESET_PASSWORD",
    entity: "User",
    entityId: id,
  });

  revalidatePath("/utilisateurs");
  return { success: "Mot de passe réinitialisé" };
}
