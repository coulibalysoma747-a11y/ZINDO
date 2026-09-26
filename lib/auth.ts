import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { supabase } from "@/lib/supabase";
import { getSession } from "@/lib/session";
import { isSubscriptionBlocked } from "@/lib/subscription";
import {
  DEFAULT_ROLE_PERMISSIONS,
  type Permission,
} from "@/lib/permissions";
import type { Role } from "@/lib/db-types";
import {
  isDesktopBuild,
  isNetworkError,
  readAuthCache,
  rememberPermission,
  writeAuthCache,
} from "@/lib/offline/auth-cache";

const BUSINESS_SELECT =
  "business:businesses(id, name, activity, activityKey:activity_key, logoUrl:logo_url, phone, email, address, city, country, currency, ticketWidth:ticket_width, ticketFooter:ticket_footer, qrCodeSize:qr_code_size, defaultMinStock:default_min_stock, plan, suspended, nextProductSeq:next_product_seq, nextSaleSeq:next_sale_seq, nextPurchaseSeq:next_purchase_seq, nextTransferSeq:next_transfer_seq, nextSessionSeq:next_session_seq, nextOnlineOrderSeq:next_online_order_seq, nextInvoiceSeq:next_invoice_seq, createdAt:created_at, updatedAt:updated_at)";
const USER_SELECT =
  "id, businessId:business_id, firstName:first_name, lastName:last_name, phone, email, passwordHash:password_hash, role, active, theme, autoPrintReceipt:auto_print_receipt, printerTicketWidth:printer_ticket_width, totpEnabled:totp_enabled, createdAt:created_at, updatedAt:updated_at, " +
  BUSINESS_SELECT;
// Repli si totp_enabled n'est pas encore migré côté base — même logique
// défensive qu'ailleurs dans le code pour une colonne pas encore appliquée,
// critique ici puisque cette requête tourne sur CHAQUE page authentifiée.
const USER_SELECT_FALLBACK =
  "id, businessId:business_id, firstName:first_name, lastName:last_name, phone, email, passwordHash:password_hash, role, active, theme, autoPrintReceipt:auto_print_receipt, printerTicketWidth:printer_ticket_width, createdAt:created_at, updatedAt:updated_at, " +
  BUSINESS_SELECT;

// Annotation de retour explicite : sans elle, TypeScript doit inférer le type
// de retour à partir du corps de la fonction, qui appelle
// lib/offline/auth-cache.ts — lequel référence CurrentUser (défini plus bas à
// partir du retour de cette même fonction), créant une dépendance circulaire.
async function getCurrentUserUncached(): Promise<Awaited<ReturnType<typeof loadUserType>> | null> {
  const session = await getSession();
  if (!session) return null;

  const initial = await supabase.from("users").select(USER_SELECT).eq("id", session.userId).maybeSingle();
  let data: unknown = initial.data;
  if (initial.error && /totp/.test(initial.error.message)) {
    const fallback = await supabase.from("users").select(USER_SELECT_FALLBACK).eq("id", session.userId).maybeSingle();
    const row = fallback.data as Record<string, unknown> | null;
    data = row ? { ...row, totpEnabled: false } : null;
  } else if (initial.error && isDesktopBuild() && isNetworkError(initial.error)) {
    // Application Windows, pas de connexion : on retombe sur le dernier
    // utilisateur connu localement plutôt que de traiter l'utilisateur
    // comme déconnecté (voir lib/offline/auth-cache.ts). Jamais atteint sur
    // le déploiement web (isDesktopBuild() y est toujours faux).
    const cached = await readAuthCache(session.userId);
    return cached?.user ?? null;
  }

  const user = data as unknown as Awaited<ReturnType<typeof loadUserType>> | null;
  if (!user || !user.active) return null;
  if (isDesktopBuild()) void writeAuthCache(user.id, { user });
  return user;
}

/** Mémorisé le temps d'une requête : le layout, la page et requirePermission le rappellent tous. */
export const getCurrentUser = cache(getCurrentUserUncached);

// Type helper uniquement — ne s'exécute jamais.
async function loadUserType() {
  return null as unknown as {
    id: string;
    businessId: string;
    firstName: string;
    lastName: string;
    phone: string;
    email: string | null;
    passwordHash: string;
    role: Role;
    active: boolean;
    theme: string;
    autoPrintReceipt: boolean;
    printerTicketWidth: string | null;
    totpEnabled: boolean;
    createdAt: string;
    updatedAt: string;
    business: {
      id: string;
      name: string;
      activity: string | null;
      activityKey: string | null;
      logoUrl: string | null;
      phone: string | null;
      email: string | null;
      address: string | null;
      city: string | null;
      country: string;
      currency: string;
      ticketWidth: string;
      ticketFooter: string;
      qrCodeSize: number;
      defaultMinStock: number;
      plan: string;
      suspended: boolean;
      nextProductSeq: number;
      nextSaleSeq: number;
      nextPurchaseSeq: number;
      nextTransferSeq: number;
      nextSessionSeq: number;
      nextOnlineOrderSeq: number;
      nextInvoiceSeq: number;
      createdAt: string;
      updatedAt: string;
    };
  };
}

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

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
  if (await isSubscriptionBlocked(user.businessId)) redirect("/abonnement");
  return user;
}

/**
 * Variante de requireUser() réservée à la page /abonnement elle-même : vérifie
 * la connexion, la suspension et l'onboarding, mais SANS la redirection vers
 * /abonnement en cas d'essai expiré — sans quoi la page qui doit justement
 * permettre de payer serait elle-même bloquée (boucle de redirection).
 */
export async function requireUserForBilling() {
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
type PermissionRows = { map: Map<string, boolean>; error: { message: string } | null };

function toPermissionRows(data: unknown, error: { message: string } | null): PermissionRows {
  const rows = (data ?? []) as { permission: string; allowed: boolean }[];
  return { map: new Map(rows.map((r) => [r.permission, r.allowed])), error };
}

// Chargement groupé et mémorisé le temps d'une requête : le menu vérifie une
// cinquantaine de permissions à chaque page. Auparavant, chacune faisait
// jusqu'à 3 requêtes Supabase à la suite, soit plus de 150 allers-retours
// avant d'afficher quoi que ce soit ; désormais 3 au total.
const loadUserPermissions = cache(async (userId: string) => {
  const { data, error } = await supabase.from("user_permissions").select("permission, allowed").eq("user_id", userId);
  return toPermissionRows(data, error);
});

const loadRolePermissions = cache(async (businessId: string, role: Role) => {
  const { data, error } = await supabase
    .from("role_permissions")
    .select("permission, allowed")
    .eq("business_id", businessId)
    .eq("role", role);
  return toPermissionRows(data, error);
});

const loadGlobalRolePermissions = cache(async (role: Role) => {
  const { data, error } = await supabase.from("global_role_permissions").select("permission, allowed").eq("role", role);
  return toPermissionRows(data, error);
});

export async function hasPermission(
  businessId: string,
  role: Role,
  permission: Permission,
  userId?: string
) {
  const [userRows, roleRows, globalRows] = await Promise.all([
    userId ? loadUserPermissions(userId) : null,
    loadRolePermissions(businessId, role),
    loadGlobalRolePermissions(role),
  ]);

  // Même ordre de priorité qu'avant : dérogation individuelle, puis
  // dérogation du commerce pour ce rôle, puis personnalisation par défaut
  // définie par l'administrateur de la plateforme (console /admin), sinon la
  // matrice codée en dur.
  for (const rows of [userRows, roleRows, globalRows]) {
    if (!rows) continue;
    if (rows.error && isDesktopBuild() && isNetworkError(rows.error)) {
      return resolvePermissionOffline(userId, role, permission);
    }
    const allowed = rows.map.get(permission);
    if (allowed !== undefined) {
      if (userId) void rememberPermission(userId, permission, allowed);
      return allowed;
    }
  }

  const result = DEFAULT_ROLE_PERMISSIONS[role].includes(permission);
  if (userId) void rememberPermission(userId, permission, result);
  return result;
}

/**
 * Application Windows hors-ligne : Supabase injoignable pendant une
 * vérification de permission. On retrouve le dernier résultat connu pour cet
 * utilisateur+permission (mémorisé par rememberPermission() lors d'une
 * précédente vérification en ligne) plutôt que de silencieusement retomber
 * sur la matrice par défaut, ce qui pourrait réautoriser hors-ligne une
 * permission explicitement retirée à ce rôle/utilisateur.
 */
async function resolvePermissionOffline(userId: string | undefined, role: Role, permission: Permission) {
  if (userId) {
    const cached = await readAuthCache(userId);
    if (cached && permission in cached.resolvedPermissions) {
      return cached.resolvedPermissions[permission];
    }
  }
  return DEFAULT_ROLE_PERMISSIONS[role].includes(permission);
}

/** À utiliser dans une page/action pour vérifier un droit précis. */
export async function requirePermission(permission: Permission) {
  const user = await requireUser();
  const allowed = await hasPermission(user.businessId, user.role, permission, user.id);
  if (!allowed) redirect("/dashboard?erreur=acces-refuse");
  return user;
}
