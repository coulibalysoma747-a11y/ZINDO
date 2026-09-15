"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { requirePermission, requireUser } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { logAction } from "@/lib/audit";
import { saveBusinessLogo, deleteUploadedImage } from "@/lib/photo-upload";
import type { PaymentMethod, Role } from "@/lib/db-types";

export type ActionState = { error?: string; success?: string } | undefined;

const businessSchema = z.object({
  name: z.string().min(1, "Nom requis"),
  phone: z.string().optional(),
  email: z.string().email("E-mail invalide").optional().or(z.literal("")),
  address: z.string().optional(),
  city: z.string().optional(),
  currency: z.string().min(1),
  ticketWidth: z.enum(["58mm", "80mm", "A4"]),
  ticketFooter: z.string().optional(),
  qrCodeSize: z.coerce.number().int().min(0),
  defaultMinStock: z.coerce.number().int().min(0),
  invoiceTagline: z.string().optional(),
  mobileMoneyInfo: z.string().optional(),
  invoiceSignerName: z.string().optional(),
  invoiceReturnPolicy: z.string().optional(),
});

export async function updateBusinessSettingsAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  const parsed = businessSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone") || undefined,
    email: formData.get("email") || "",
    address: formData.get("address") || undefined,
    city: formData.get("city") || undefined,
    currency: formData.get("currency"),
    ticketWidth: formData.get("ticketWidth"),
    ticketFooter: formData.get("ticketFooter") || undefined,
    qrCodeSize: formData.get("qrCodeSize") || 0,
    defaultMinStock: formData.get("defaultMinStock"),
    invoiceTagline: formData.get("invoiceTagline") || undefined,
    mobileMoneyInfo: formData.get("mobileMoneyInfo") || undefined,
    invoiceSignerName: formData.get("invoiceSignerName") || undefined,
    invoiceReturnPolicy: formData.get("invoiceReturnPolicy") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  let logoUrl: string | null | undefined;
  const logoFile = formData.get("logo");
  const removeLogo = formData.get("removeLogo") === "true";
  if (logoFile instanceof File && logoFile.size > 0) {
    const result = await saveBusinessLogo(logoFile);
    if ("error" in result) return { error: result.error };
    logoUrl = result.url;
    await deleteUploadedImage(user.business.logoUrl);
  } else if (removeLogo) {
    logoUrl = null;
    await deleteUploadedImage(user.business.logoUrl);
  }

  const { error } = await supabase
    .from("businesses")
    .update({
      name: parsed.data.name,
      phone: parsed.data.phone ?? null,
      email: parsed.data.email || null,
      address: parsed.data.address ?? null,
      city: parsed.data.city ?? null,
      currency: parsed.data.currency,
      ticket_width: parsed.data.ticketWidth,
      ticket_footer: parsed.data.ticketFooter ?? null,
      qr_code_size: parsed.data.qrCodeSize,
      default_min_stock: parsed.data.defaultMinStock,
      invoice_tagline: parsed.data.invoiceTagline ?? null,
      mobile_money_info: parsed.data.mobileMoneyInfo ?? null,
      invoice_signer_name: parsed.data.invoiceSignerName ?? null,
      invoice_return_policy: parsed.data.invoiceReturnPolicy ?? null,
      ...(logoUrl !== undefined ? { logo_url: logoUrl } : {}),
    })
    .eq("id", user.businessId);
  if (error) {
    console.error("[updateBusinessSettingsAction] Échec de la mise à jour :", error.message);
    return { error: "Impossible d'enregistrer les paramètres" };
  }

  await logAction({
    businessId: user.businessId,
    userId: user.id,
    action: "UPDATE",
    entity: "Business",
    entityId: user.businessId,
  });

  revalidatePath("/parametres");
  return { success: "Paramètres enregistrés" };
}

export async function togglePaymentMethodAction(method: PaymentMethod, enabled: boolean) {
  const user = await requirePermission(PERMISSIONS.SETTINGS_MANAGE);

  const { error } = await supabase
    .from("payment_method_configs")
    .upsert(
      { business_id: user.businessId, method, label: method, enabled },
      { onConflict: "business_id,method", ignoreDuplicates: false }
    );
  if (error) {
    console.error("[togglePaymentMethodAction] Échec de la mise à jour :", error.message);
    return { error: "Impossible de mettre à jour le moyen de paiement" };
  }

  revalidatePath("/parametres");
  return { success: "Moyen de paiement mis à jour" };
}

export async function togglePermissionAction(role: Role, permission: string, allowed: boolean) {
  const user = await requirePermission(PERMISSIONS.SETTINGS_MANAGE);

  const { error } = await supabase
    .from("role_permissions")
    .upsert(
      { business_id: user.businessId, role, permission, allowed },
      { onConflict: "business_id,role,permission", ignoreDuplicates: false }
    );
  if (error) {
    console.error("[togglePermissionAction] Échec de la mise à jour :", error.message);
    return { error: "Impossible de mettre à jour la permission" };
  }

  revalidatePath("/parametres");
  return { success: "Permission mise à jour" };
}

export async function resetRolePermissionsAction(role: Role) {
  const user = await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  const { error } = await supabase
    .from("role_permissions")
    .delete()
    .eq("business_id", user.businessId)
    .eq("role", role);
  if (error) {
    console.error("[resetRolePermissionsAction] Échec de la réinitialisation :", error.message);
    return { error: "Impossible de réinitialiser les permissions" };
  }
  revalidatePath("/parametres");
  return { success: "Permissions réinitialisées" };
}

const profileSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email("E-mail invalide").optional().or(z.literal("")),
});

export async function updateProfileAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email") || "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const { error } = await supabase
    .from("users")
    .update({
      first_name: parsed.data.firstName,
      last_name: parsed.data.lastName,
      email: parsed.data.email || null,
    })
    .eq("id", user.id);
  if (error) {
    console.error("[updateProfileAction] Échec de la mise à jour :", error.message);
    return { error: "Impossible de mettre à jour le profil" };
  }

  revalidatePath("/profil");
  return { success: "Profil mis à jour" };
}

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Mot de passe actuel requis"),
  newPassword: z.string().min(6, "6 caractères minimum"),
});

export async function changePasswordAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = passwordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const valid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!valid) return { error: "Mot de passe actuel incorrect" };

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);
  const { error } = await supabase.from("users").update({ password_hash: passwordHash }).eq("id", user.id);
  if (error) {
    console.error("[changePasswordAction] Échec de la mise à jour :", error.message);
    return { error: "Impossible de modifier le mot de passe" };
  }

  return { success: "Mot de passe modifié" };
}
