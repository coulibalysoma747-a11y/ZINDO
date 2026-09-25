"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { logAction } from "@/lib/audit";

export type ActionState = { error?: string; success?: string } | undefined;

const supplierSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  company: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("E-mail invalide").optional().or(z.literal("")),
  address: z.string().optional(),
  notes: z.string().optional(),
});

function parse(formData: FormData) {
  return supplierSchema.safeParse({
    name: formData.get("name"),
    company: formData.get("company") || undefined,
    phone: formData.get("phone") || undefined,
    email: formData.get("email") || "",
    address: formData.get("address") || undefined,
    notes: formData.get("notes") || undefined,
  });
}

export async function createSupplierAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const result = await createSupplierCore(parsed.data);
  if (!result.success) return { error: result.error };
  return { success: "Fournisseur créé" };
}

export type CreateSupplierInput = {
  name: string;
  company?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  /** Clé d'idempotence pour un fournisseur créé hors ligne (voir lib/offline/) — absente pour un fournisseur créé normalement en ligne. */
  clientRef?: string;
};

export type CreateSupplierResult = { success: true; supplierId: string } | { success: false; error: string };

/** Entrée JSON équivalente à createSupplierAction, pour le rejeu hors ligne (lib/offline/) et pour exposer l'id créé. */
export async function createSupplierJsonAction(input: CreateSupplierInput): Promise<CreateSupplierResult> {
  return createSupplierCore({ ...input, email: input.email ?? "" });
}

async function createSupplierCore(data: {
  name: string;
  company?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  clientRef?: string;
}): Promise<CreateSupplierResult> {
  const user = await requirePermission(PERMISSIONS.SUPPLIERS_MANAGE);

  if (data.clientRef) {
    const { data: existing } = await supabase
      .from("suppliers")
      .select("id")
      .eq("business_id", user.businessId)
      .eq("client_ref", data.clientRef)
      .maybeSingle();
    if (existing) return { success: true, supplierId: existing.id as string };
  }

  const { data: supplier, error } = await supabase
    .from("suppliers")
    .insert({
      business_id: user.businessId,
      name: data.name,
      company: data.company ?? null,
      phone: data.phone ?? null,
      email: data.email || null,
      address: data.address ?? null,
      notes: data.notes ?? null,
      client_ref: data.clientRef ?? null,
    })
    .select("id")
    .single();
  if (error || !supplier) {
    console.error("[createSupplierAction] Échec de la création :", error?.message);
    return { success: false, error: "Impossible de créer le fournisseur" };
  }

  await logAction({
    businessId: user.businessId,
    userId: user.id,
    action: "CREATE",
    entity: "Supplier",
    entityId: supplier.id as string,
  });

  revalidatePath("/fournisseurs");
  return { success: true, supplierId: supplier.id as string };
}

export async function updateSupplierAction(
  id: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requirePermission(PERMISSIONS.SUPPLIERS_MANAGE);
  const parsed = parse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const { data: supplier } = await supabase
    .from("suppliers")
    .select("id")
    .eq("id", id)
    .eq("business_id", user.businessId)
    .maybeSingle();
  if (!supplier) return { error: "Fournisseur introuvable" };

  const { error } = await supabase
    .from("suppliers")
    .update({
      name: parsed.data.name,
      company: parsed.data.company ?? null,
      phone: parsed.data.phone ?? null,
      email: parsed.data.email || null,
      address: parsed.data.address ?? null,
      notes: parsed.data.notes ?? null,
    })
    .eq("id", id);
  if (error) {
    console.error("[updateSupplierAction] Échec de la mise à jour :", error.message);
    return { error: "Impossible de mettre à jour le fournisseur" };
  }

  // Délai de livraison (réassort intelligent) : champ affiché seulement quand
  // le module est activé, écrit à part pour ne jamais bloquer la mise à jour.
  if (formData.has("leadTimeDays")) {
    const raw = Number(formData.get("leadTimeDays"));
    const leadTime = formData.get("leadTimeDays") !== "" && Number.isInteger(raw) && raw >= 0 && raw <= 365 ? raw : null;
    const { error: leadError } = await supabase.from("suppliers").update({ lead_time_days: leadTime }).eq("id", id);
    if (leadError) console.error("[updateSupplierAction] Échec du délai de livraison :", leadError.message);
  }

  await logAction({
    businessId: user.businessId,
    userId: user.id,
    action: "UPDATE",
    entity: "Supplier",
    entityId: id,
  });

  revalidatePath("/fournisseurs");
  revalidatePath(`/fournisseurs/${id}`);
  return { success: "Fournisseur mis à jour" };
}

export async function deleteSupplierAction(id: string) {
  const user = await requirePermission(PERMISSIONS.SUPPLIERS_MANAGE);
  const { data: supplier } = await supabase
    .from("suppliers")
    .select("id")
    .eq("id", id)
    .eq("business_id", user.businessId)
    .maybeSingle();
  if (!supplier) return { error: "Fournisseur introuvable" };

  const [{ count: productCount }, { count: purchaseCount }] = await Promise.all([
    supabase.from("products").select("id", { count: "exact", head: true }).eq("supplier_id", id),
    supabase.from("purchases").select("id", { count: "exact", head: true }).eq("supplier_id", id),
  ]);
  if ((productCount ?? 0) > 0 || (purchaseCount ?? 0) > 0) {
    return { error: "Impossible de supprimer : ce fournisseur est lié à des produits ou achats" };
  }

  const { error } = await supabase.from("suppliers").delete().eq("id", id);
  if (error) {
    console.error("[deleteSupplierAction] Échec de la suppression :", error.message);
    return { error: "Impossible de supprimer le fournisseur" };
  }

  revalidatePath("/fournisseurs");
  return { success: "Fournisseur supprimé" };
}
