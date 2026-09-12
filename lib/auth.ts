import "server-only";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import {
  DEFAULT_ROLE_PERMISSIONS,
  type Permission,
} from "@/lib/permissions";
import type { Role } from "@prisma/client";

export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { business: true },
  });

  if (!user || !user.active) return null;
  return user;
}

/**
 * Vérifie la connexion et la suspension, sans forcer le choix d'activité —
 * réservé à la page /choisir-activite elle-même, pour éviter une boucle de
 * redirection avec requireUser() ci-dessous.
 */
export async function requireUserAllowingActivitySetup() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.business.suspended) redirect("/compte-suspendu");
  return user;
}

/**
 * À utiliser en haut d'une page/layout protégé. Redirige vers /login si non
 * connecté, vers /compte-suspendu si le commerce a été désactivé par
 * l'administrateur de la plateforme, ou vers /choisir-activite si l'onboarding
 * "Quelle est votre activité ?" n'a encore jamais été complété.
 */
export async function requireUser() {
  const user = await requireUserAllowingActivitySetup();
  if (!user.business.activityKey) redirect("/choisir-activite");
  return user;
}

/**
 * `userId` est facultatif pour ne pas casser les appels existants qui ne
 * vérifient qu'un droit lié au rôle (ex. panneau de permissions par rôle) ;
 * quand il est fourni, une dérogation individuelle (UserPermission, définie
 * depuis la console administrateur /admin) prend le pas sur tout le reste.
 */
export async function hasPermission(
  businessId: string,
  role: Role,
  permission: Permission,
  userId?: string
) {
  if (userId) {
    const userOverride = await prisma.userPermission.findUnique({
      where: { userId_permission: { userId, permission } },
    });
    if (userOverride) return userOverride.allowed;
  }

  const override = await prisma.rolePermission.findUnique({
    where: { businessId_role_permission: { businessId, role, permission } },
  });
  if (override) return override.allowed;

  // Personnalisation par défaut définie par l'administrateur de la plateforme
  // (console /admin), appliquée à tous les commerces qui n'ont pas leur propre
  // override — sinon on retombe sur la matrice codée en dur.
  const globalOverride = await prisma.globalRolePermission.findUnique({
    where: { role_permission: { role, permission } },
  });
  if (globalOverride) return globalOverride.allowed;

  return DEFAULT_ROLE_PERMISSIONS[role].includes(permission);
}

/** À utiliser dans une page/action pour vérifier un droit précis. */
export async function requirePermission(permission: Permission) {
  const user = await requireUser();
  const allowed = await hasPermission(user.businessId, user.role, permission, user.id);
  if (!allowed) redirect("/dashboard?erreur=acces-refuse");
  return user;
}
