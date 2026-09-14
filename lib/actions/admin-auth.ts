"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import bcrypt from "bcryptjs";
import { supabase } from "@/lib/supabase";
import { createAdminSession, destroyAdminSession } from "@/lib/adminSession";
import { requireSuperAdmin } from "@/lib/superadmin-auth";

async function logLoginEvent(params: {
  email: string;
  success: boolean;
  superAdminId?: string;
  actorName?: string;
}) {
  const headerList = await headers();
  const ipAddress = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = headerList.get("user-agent");
  await supabase.from("super_admin_login_events").insert({
    email: params.email,
    success: params.success,
    super_admin_id: params.superAdminId ?? null,
    actor_name: params.actorName ?? null,
    ip_address: ipAddress,
    user_agent: userAgent,
  });
}

export type ActionState = { error?: string; success?: string } | undefined;

const loginSchema = z.object({
  email: z.string().email("E-mail invalide"),
  password: z.string().min(1, "Code d'accès requis"),
});

export async function superAdminLoginAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const email = parsed.data.email.toLowerCase();
  const { data: admin } = await supabase
    .from("super_admins")
    .select("id, email, passwordHash:password_hash, name, role")
    .eq("email", email)
    .maybeSingle();
  if (!admin) {
    await logLoginEvent({ email, success: false });
    return { error: "Identifiants incorrects" };
  }

  const valid = await bcrypt.compare(parsed.data.password, admin.passwordHash as string);
  if (!valid) {
    await logLoginEvent({ email, success: false, superAdminId: admin.id as string, actorName: admin.name as string });
    return { error: "Identifiants incorrects" };
  }

  await logLoginEvent({ email, success: true, superAdminId: admin.id as string, actorName: admin.name as string });
  await createAdminSession({ adminId: admin.id as string });
  redirect("/admin");
}

export async function superAdminLogoutAction() {
  await destroyAdminSession();
  redirect("/admin/login");
}

const profileSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  email: z.string().email("E-mail invalide"),
  currentPassword: z.string().min(1, "Mot de passe actuel requis"),
  newPassword: z.string().optional(),
});

export async function updateSuperAdminProfileAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const admin = await requireSuperAdmin();
  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const valid = await bcrypt.compare(parsed.data.currentPassword, admin.passwordHash as string);
  if (!valid) return { error: "Mot de passe actuel incorrect" };

  const email = parsed.data.email.toLowerCase();
  if (email !== admin.email) {
    const { data: existing } = await supabase.from("super_admins").select("id").eq("email", email).maybeSingle();
    if (existing) return { error: "Cet e-mail est déjà utilisé" };
  }

  const update: { name: string; email: string; password_hash?: string } = {
    name: parsed.data.name,
    email,
  };
  if (parsed.data.newPassword) {
    if (parsed.data.newPassword.length < 8) {
      return { error: "Le nouveau code d'accès doit contenir au moins 8 caractères" };
    }
    update.password_hash = await bcrypt.hash(parsed.data.newPassword, 10);
  }

  await supabase.from("super_admins").update(update).eq("id", admin.id);

  return { success: "Profil mis à jour" };
}
