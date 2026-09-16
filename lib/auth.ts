import "server-only";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getSession } from "@/lib/session";
import { isSubscriptionBlocked } from "@/lib/subscription";
import {
  DEFAULT_ROLE_PERMISSIONS,
  type Permission,
} from "@/lib/permissions";
import type { Role } from "@/lib/db-types";

const USER_SELECT =
  "id, businessId:business_id, firstName:first_name, lastName:last_name, phone, email, passwordHash:password_hash, role, active, theme, autoPrintReceipt:auto_print_receipt, printerTicketWidth:printer_ticket_width, createdAt:created_at, updatedAt:updated_at, " +
  "business:businesses(id, name, activity, activityKey:activity_key, logoUrl:logo_url, phone, email, address, city, country, currency, ticketWidth:ticket_width, ticketFooter:ticket_footer, qrCodeSize:qr_code_size, defaultMinStock:default_min_stock, plan, suspended, nextProductSeq:next_product_seq, nextSaleSeq:next_sale_seq, nextPurchaseSeq:next_purchase_seq, nextTransferSeq:next_transfer_seq, nextSessionSeq:next_session_seq, nextOnlineOrderSeq:next_online_order_seq, nextInvoiceSeq:next_invoice_seq, createdAt:created_at, updatedAt:updated_at)";

export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;

  const { data } = await supabase
    .from("users")
    .select(USER_SELECT)
    .eq("id", session.userId)
    .maybeSingle();

  const user = data as unknown as Awaited<ReturnType<typeof loadUserType>> | null;
  if (!user || !user.active) return null;
  return user;
}

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
export async function hasPermission(
  businessId: string,
  role: Role,
  permission: Permission,
  userId?: string
) {
  if (userId) {
    const { data: userOverride } = await supabase
      .from("user_permissions")
      .select("allowed")
      .eq("user_id", userId)
      .eq("permission", permission)
      .maybeSingle();
    if (userOverride) return userOverride.allowed;
  }

  const { data: override } = await supabase
    .from("role_permissions")
    .select("allowed")
    .eq("business_id", businessId)
    .eq("role", role)
    .eq("permission", permission)
    .maybeSingle();
  if (override) return override.allowed;

  // Personnalisation par défaut définie par l'administrateur de la
  // plateforme (console /admin), appliquée à tous les commerces qui n'ont pas
  // leur propre override — sinon on retombe sur la matrice codée en dur.
  const { data: globalOverride } = await supabase
    .from("global_role_permissions")
    .select("allowed")
    .eq("role", role)
    .eq("permission", permission)
    .maybeSingle();
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
