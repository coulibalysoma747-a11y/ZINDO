"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireFounder } from "@/lib/superadmin-auth";
import { logAdminAction } from "@/lib/admin-audit";

export type ActionState = { error?: string; success?: string } | undefined;

const createAdminSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  email: z.string().email("E-mail invalide"),
  password: z.string().min(8, "8 caractères minimum"),
});

/** Réservé au fondateur : créer un compte administrateur de plateforme (role ADMIN, jamais FOUNDER). */
export async function createAdminAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const founder = await requireFounder();
  const parsed = createAdminSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const email = parsed.data.email.toLowerCase();
  const existing = await prisma.superAdmin.findUnique({ where: { email } });
  if (existing) return { error: "Cet e-mail est déjà utilisé" };

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const admin = await prisma.superAdmin.create({
    data: { name: parsed.data.name, email, passwordHash, role: "ADMIN" },
  });

  await logAdminAction({
    superAdminId: founder.id,
    actorName: founder.name,
    action: "CREATE",
    entity: "SuperAdmin",
    entityId: admin.id,
    details: `${admin.name} <${admin.email}>`,
  });

  revalidatePath("/admin/administrateurs");
  return { success: "Compte administrateur créé" };
}

export type DeleteAdminResult = { success?: string; error?: string };

/**
 * Réservé au fondateur : supprimer un compte administrateur de plateforme.
 * Protection : le compte fondateur ne peut jamais être ciblé, et le fondateur
 * doit ressaisir son mot de passe pour confirmer une action aussi sensible.
 */
export async function deleteAdminAction(adminId: string, currentPassword: string): Promise<DeleteAdminResult> {
  const founder = await requireFounder();

  const valid = await bcrypt.compare(currentPassword, founder.passwordHash);
  if (!valid) return { error: "Mot de passe incorrect" };

  const target = await prisma.superAdmin.findUnique({ where: { id: adminId } });
  if (!target) return { error: "Compte introuvable" };
  if (target.role === "FOUNDER") {
    return { error: "Le compte fondateur ne peut pas être supprimé" };
  }

  await prisma.superAdmin.delete({ where: { id: adminId } });

  await logAdminAction({
    superAdminId: founder.id,
    actorName: founder.name,
    action: "DELETE",
    entity: "SuperAdmin",
    entityId: adminId,
    details: `${target.name} <${target.email}>`,
  });

  revalidatePath("/admin/administrateurs");
  return { success: "Compte administrateur supprimé" };
}
