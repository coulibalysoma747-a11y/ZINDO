import "server-only";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/adminSession";

export async function getCurrentSuperAdmin() {
  const session = await getAdminSession();
  if (!session) return null;

  const admin = await prisma.superAdmin.findUnique({ where: { id: session.adminId } });
  return admin;
}

/** À utiliser en haut de toute page de la console /admin protégée. */
export async function requireSuperAdmin() {
  const admin = await getCurrentSuperAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}

/**
 * Réservé au compte Créateur / Fondateur / Propriétaire : gestion des autres
 * comptes administrateur et consultation du journal d'activité de la
 * plateforme. Un administrateur "simple" (role ADMIN) est redirigé.
 */
export async function requireFounder() {
  const admin = await requireSuperAdmin();
  if (admin.role !== "FOUNDER") redirect("/admin?erreur=acces-refuse");
  return admin;
}
