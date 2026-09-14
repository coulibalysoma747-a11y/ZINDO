import "server-only";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getAdminSession } from "@/lib/adminSession";

const SUPER_ADMIN_SELECT =
  "id, email, passwordHash:password_hash, name, role, createdAt:created_at, updatedAt:updated_at";

export async function getCurrentSuperAdmin() {
  const session = await getAdminSession();
  if (!session) return null;

  const { data: admin } = await supabase
    .from("super_admins")
    .select(SUPER_ADMIN_SELECT)
    .eq("id", session.adminId)
    .maybeSingle();

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
