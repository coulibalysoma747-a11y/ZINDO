"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { logAction } from "@/lib/audit";

export type ActionState = { error?: string; success?: string } | undefined;

const customerSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  phone: z.string().optional(),
  email: z.string().email("E-mail invalide").optional().or(z.literal("")),
  address: z.string().optional(),
  creditLimit: z.coerce.number().min(0).default(0),
});

function parse(formData: FormData) {
  return customerSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone") || undefined,
    email: formData.get("email") || "",
    address: formData.get("address") || undefined,
    creditLimit: formData.get("creditLimit") || 0,
  });
}

export async function createCustomerAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const result = await createCustomerCore(parsed.data);
  if (!result.success) return { error: result.error };
  return { success: "Client créé" };
}

export type CreateCustomerInput = {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  creditLimit?: number;
  /** Clé d'idempotence pour un client créé hors ligne (voir lib/offline/) — absente pour un client créé normalement en ligne. */
  clientRef?: string;
};

export type CreateCustomerResult = { success: true; customerId: string } | { success: false; error: string };

/** Entrée JSON équivalente à createCustomerAction, pour le rejeu hors ligne (lib/offline/) et pour exposer l'id créé (nécessaire aux écritures qui en dépendent, ex. une vente à crédit pour ce client). */
export async function createCustomerJsonAction(input: CreateCustomerInput): Promise<CreateCustomerResult> {
  return createCustomerCore({
    name: input.name,
    phone: input.phone,
    email: input.email ?? "",
    address: input.address,
    creditLimit: input.creditLimit ?? 0,
    clientRef: input.clientRef,
  });
}

async function createCustomerCore(data: {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  creditLimit: number;
  clientRef?: string;
}): Promise<CreateCustomerResult> {
  const user = await requirePermission(PERMISSIONS.CUSTOMERS_MANAGE);

  if (data.clientRef) {
    const { data: existing } = await supabase
      .from("customers")
      .select("id")
      .eq("business_id", user.businessId)
      .eq("client_ref", data.clientRef)
      .maybeSingle();
    if (existing) return { success: true, customerId: existing.id as string };
  }

  const { data: customer, error } = await supabase
    .from("customers")
    .insert({
      business_id: user.businessId,
      name: data.name,
      phone: data.phone ?? null,
      email: data.email || null,
      address: data.address ?? null,
      credit_limit: data.creditLimit,
      client_ref: data.clientRef ?? null,
    })
    .select("id")
    .single();
  if (error || !customer) {
    console.error("[createCustomerAction] Échec de la création :", error?.message);
    return { success: false, error: "Impossible de créer le client" };
  }

  await logAction({
    businessId: user.businessId,
    userId: user.id,
    action: "CREATE",
    entity: "Customer",
    entityId: customer.id as string,
  });

  revalidatePath("/clients");
  return { success: true, customerId: customer.id as string };
}

export async function updateCustomerAction(
  id: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requirePermission(PERMISSIONS.CUSTOMERS_MANAGE);
  const parsed = parse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const { data: customer } = await supabase
    .from("customers")
    .select("id")
    .eq("id", id)
    .eq("business_id", user.businessId)
    .maybeSingle();
  if (!customer) return { error: "Client introuvable" };

  const { error } = await supabase
    .from("customers")
    .update({
      name: parsed.data.name,
      phone: parsed.data.phone ?? null,
      email: parsed.data.email || null,
      address: parsed.data.address ?? null,
      credit_limit: parsed.data.creditLimit,
    })
    .eq("id", id);
  if (error) {
    console.error("[updateCustomerAction] Échec de la mise à jour :", error.message);
    return { error: "Impossible de mettre à jour le client" };
  }

  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
  return { success: "Client mis à jour" };
}

export async function deleteCustomerAction(id: string) {
  const user = await requirePermission(PERMISSIONS.CUSTOMERS_MANAGE);
  const { data: customer } = await supabase
    .from("customers")
    .select("id")
    .eq("id", id)
    .eq("business_id", user.businessId)
    .maybeSingle();
  if (!customer) return { error: "Client introuvable" };

  const { count: saleCount } = await supabase
    .from("sales")
    .select("id", { count: "exact", head: true })
    .eq("customer_id", id);
  if (saleCount && saleCount > 0) {
    return { error: "Impossible de supprimer : ce client a des ventes enregistrées" };
  }

  const { error } = await supabase.from("customers").delete().eq("id", id);
  if (error) {
    console.error("[deleteCustomerAction] Échec de la suppression :", error.message);
    return { error: "Impossible de supprimer le client" };
  }

  revalidatePath("/clients");
  return { success: "Client supprimé" };
}

export async function recordCustomerPaymentAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requirePermission(PERMISSIONS.CUSTOMERS_MANAGE);
  const customerId = String(formData.get("customerId"));
  const amount = Number(formData.get("amount"));
  const method = String(formData.get("method") || "ESPECES");
  const note = String(formData.get("note") || "") || null;

  if (!amount || amount <= 0) return { error: "Montant invalide" };

  const { data: customer } = await supabase
    .from("customers")
    .select("id")
    .eq("id", customerId)
    .eq("business_id", user.businessId)
    .maybeSingle();
  if (!customer) return { error: "Client introuvable" };

  const { error } = await supabase
    .from("customer_payments")
    .insert({ customer_id: customerId, amount, method, note, user_id: user.id });
  if (error) {
    console.error("[recordCustomerPaymentAction] Échec de l'enregistrement :", error.message);
    return { error: "Impossible d'enregistrer le paiement" };
  }

  await logAction({
    businessId: user.businessId,
    userId: user.id,
    action: "PAYMENT",
    entity: "Customer",
    entityId: customerId,
    details: `Remboursement de ${amount}`,
  });

  revalidatePath(`/clients/${customerId}`);
  revalidatePath("/credits");
  return { success: "Paiement enregistré" };
}
