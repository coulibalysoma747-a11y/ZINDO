"use server";

import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { requireFounder } from "@/lib/superadmin-auth";
import { createSession, getSession, destroySession } from "@/lib/session";
import { getAdminSession } from "@/lib/adminSession";
import { logAdminAction } from "@/lib/admin-audit";
import type { Role } from "@/lib/db-types";

/**
 * Réservé au Fondateur : ouvre une session commerçant normale pour ce
 * compte, SANS connaître son mot de passe et SANS détruire la session
 * admin — les deux cookies coexistent (voir ImpersonationBanner). Toute
 * usurpation est journalisée dans super_admin_audit_logs.
 */
export async function impersonateUserAction(userId: string) {
  const admin = await requireFounder();

  const { data: user } = await supabase
    .from("users")
    .select("id, businessId:business_id, role, active, firstName:first_name, lastName:last_name, business:businesses(name)")
    .eq("id", userId)
    .maybeSingle();
  if (!user || !user.active) return { error: "Utilisateur introuvable ou désactivé" };

  await createSession({ userId: user.id as string, businessId: user.businessId as string, role: user.role as Role });

  const businessName = (user.business as unknown as { name: string } | null)?.name ?? "commerce inconnu";
  await logAdminAction({
    superAdminId: admin.id,
    actorName: admin.name,
    action: "IMPERSONATE",
    entity: "User",
    entityId: user.id as string,
    details: `Connexion en tant que ${user.firstName} ${user.lastName} (${businessName})`,
  });

  redirect("/dashboard");
}

/** Termine l'usurpation en cours : détruit la session commerçant, garde la session admin. No-op si appelé hors contexte admin. */
export async function stopImpersonationAction() {
  const adminSession = await getAdminSession();
  if (!adminSession) return;

  const session = await getSession();
  await destroySession();
  redirect(session ? `/admin/commercants/${session.businessId}` : "/admin");
}
