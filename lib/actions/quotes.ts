"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { requirePermission, requireUser, hasPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { logAction } from "@/lib/audit";
import { generateQuoteNumber } from "@/lib/reference";
import { registerFeatureFlag, isFeatureEnabled } from "@/lib/feature-flags";
import { rethrowIfNavigationSignal } from "@/lib/action-errors";
import { createSaleAction } from "@/lib/actions/sales";
import type { FactureData } from "@/components/sales/Facture";
import type { PaymentMethod } from "@/lib/db-types";

/**
 * Devis : nouvelle fonctionnalité, désactivée par défaut tant qu'elle n'est
 * pas explicitement activée depuis /admin/fonctionnalites — voir la règle du
 * memory "Feature rollout rule".
 */
const QUOTE_FLAG = "devis";

export async function ensureQuoteFlagRegistered() {
  await registerFeatureFlag(
    QUOTE_FLAG,
    "Devis",
    "Créez des devis pour vos clients (sans impact sur le stock), convertibles en vente une fois acceptés."
  );
}

export async function isQuoteModuleEnabled(businessId: string) {
  return isFeatureEnabled(QUOTE_FLAG, businessId);
}

export type QuoteItemInput = {
  productId: string;
  name: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  discount: number;
};

export type CreateQuoteInput = {
  locationId: string;
  items: QuoteItemInput[];
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  discount: number;
  validUntil?: string;
  note?: string;
};

export type QuoteActionResult = { error?: string; success?: string; quoteId?: string };

export async function createQuoteAction(input: CreateQuoteInput): Promise<QuoteActionResult> {
  try {
    return await createQuoteImpl(input);
  } catch (e) {
    rethrowIfNavigationSignal(e);
    console.error("[createQuoteAction] Erreur inattendue :", e);
    return { error: "Une erreur inattendue est survenue. Réessayez dans un instant." };
  }
}

async function createQuoteImpl(input: CreateQuoteInput): Promise<QuoteActionResult> {
  const user = await requirePermission(PERMISSIONS.SALES_CREATE);

  if (!input.locationId) return { error: "Boutique introuvable" };
  if (!input.items || input.items.length === 0) return { error: "Le devis ne contient aucun article" };

  const { data: location } = await supabase
    .from("locations")
    .select("id")
    .eq("id", input.locationId)
    .eq("business_id", user.businessId)
    .maybeSingle();
  if (!location) return { error: "Boutique introuvable" };

  const subtotal = input.items.reduce((sum, i) => sum + i.unitPrice * i.quantity - i.discount, 0);
  const total = Math.max(0, subtotal - input.discount);
  const number = await generateQuoteNumber(user.businessId);

  const { data: quote, error: quoteError } = await supabase
    .from("quotes")
    .insert({
      business_id: user.businessId,
      location_id: input.locationId,
      number,
      customer_id: input.customerId || null,
      customer_name: input.customerName || null,
      customer_phone: input.customerPhone || null,
      user_id: user.id,
      subtotal,
      discount: input.discount,
      total,
      status: "BROUILLON",
      valid_until: input.validUntil || null,
      note: input.note || null,
    })
    .select("id")
    .single();
  if (quoteError || !quote) {
    console.error("[createQuoteAction] Échec de la création du devis :", quoteError?.message);
    return { error: "Impossible d'enregistrer le devis" };
  }

  const { error: itemsError } = await supabase.from("quote_items").insert(
    input.items.map((i) => ({
      quote_id: quote.id,
      product_id: i.productId,
      name: i.name,
      unit: i.unit,
      quantity: i.quantity,
      unit_price: i.unitPrice,
      discount: i.discount,
      total: i.unitPrice * i.quantity - i.discount,
    }))
  );
  if (itemsError) {
    console.error("[createQuoteAction] Échec de l'enregistrement des articles :", itemsError.message);
    return { error: "Impossible d'enregistrer les articles du devis" };
  }

  await logAction({ businessId: user.businessId, userId: user.id, action: "CREATE", entity: "Quote", entityId: quote.id as string });
  revalidatePath("/devis");
  return { success: "Devis enregistré", quoteId: quote.id as string };
}

type QuoteListRow = {
  id: string;
  number: string;
  status: string;
  total: number;
  validUntil: string | null;
  createdAt: string;
  customerName: string | null;
  customer: { name: string } | null;
};

export type QuoteListItem = {
  id: string;
  number: string;
  status: string;
  total: number;
  validUntil: string | null;
  createdAt: string;
  customerLabel: string;
};

export async function listQuotesAction(): Promise<QuoteListItem[]> {
  const user = await requireUser();
  const { data } = await supabase
    .from("quotes")
    .select("id, number, status, total, validUntil:valid_until, createdAt:created_at, customerName:customer_name, customer:customers(name)")
    .eq("business_id", user.businessId)
    .order("created_at", { ascending: false })
    .limit(200);

  return ((data ?? []) as unknown as QuoteListRow[]).map((q) => ({
    id: q.id,
    number: q.number,
    status: q.status,
    total: q.total,
    validUntil: q.validUntil,
    createdAt: q.createdAt,
    customerLabel: q.customer?.name ?? q.customerName ?? "Client de passage",
  }));
}

export type QuoteDocument =
  | { success: true; quoteId: string; status: string; canEdit: boolean; canConvert: boolean; data: FactureData }
  | { success: false; error: string };

export async function getQuoteDocumentAction(quoteId: string): Promise<QuoteDocument> {
  const user = await requirePermission(PERMISSIONS.SALES_VIEW);

  const { data } = await supabase
    .from("quotes")
    .select(
      "id, number, status, subtotal, discount, total, validUntil:valid_until, note, createdAt:created_at, customerName:customer_name, customerPhone:customer_phone, " +
        "customer:customers(name, phone, address), user:users(firstName:first_name, lastName:last_name), location:locations(name, address), " +
        "items:quote_items(name, unit, quantity, unitPrice:unit_price, discount, total)"
    )
    .eq("id", quoteId)
    .eq("business_id", user.businessId)
    .maybeSingle();
  if (!data) return { success: false, error: "Devis introuvable" };

  const quote = data as unknown as {
    id: string;
    number: string;
    status: string;
    subtotal: number;
    discount: number;
    total: number;
    validUntil: string | null;
    note: string | null;
    createdAt: string;
    customerName: string | null;
    customerPhone: string | null;
    customer: { name: string; phone: string | null; address: string | null } | null;
    user: { firstName: string; lastName: string };
    location: { name: string; address: string | null };
    items: Array<{ name: string; unit: string; quantity: number; unitPrice: number; discount: number; total: number }>;
  };

  const business = user.business;
  const canEdit = await hasPermission(user.businessId, user.role, PERMISSIONS.SALES_CREATE, user.id);

  const factureData: FactureData = {
    businessName: business.name,
    businessActivity: business.activity,
    businessPhone: business.phone,
    businessAddress: business.address,
    businessEmail: business.email,
    businessCity: business.city,
    logoUrl: business.logoUrl,
    locationName: quote.location.name,
    locationAddress: quote.location.address,
    invoiceNumber: quote.number,
    date: new Date(quote.createdAt),
    cashierName: `${quote.user.firstName} ${quote.user.lastName}`,
    customerName: quote.customer?.name ?? quote.customerName,
    customerPhone: quote.customer?.phone ?? quote.customerPhone,
    customerAddress: quote.customer?.address,
    items: quote.items.map((i) => ({ name: i.name, unit: i.unit, quantity: i.quantity, unitPrice: i.unitPrice, discount: i.discount, total: i.total })),
    subtotal: quote.subtotal,
    discount: quote.discount,
    total: quote.total,
    footerMessage: quote.note || business.ticketFooter,
    currency: business.currency,
    documentTitle: "Devis",
    partyLabel: "Devis pour",
    validUntil: quote.validUntil,
    tagline: business.invoiceTagline,
    mobileMoneyInfo: business.mobileMoneyInfo,
    signerName: business.invoiceSignerName,
  };

  return {
    success: true,
    quoteId: quote.id,
    status: quote.status,
    canEdit: canEdit && quote.status !== "CONVERTI",
    canConvert: canEdit && quote.status !== "CONVERTI" && quote.status !== "REFUSE" && quote.status !== "EXPIRE",
    data: factureData,
  };
}

const STATUS_TRANSITIONS: Record<string, string> = {
  ENVOYE: "ENVOYE",
  ACCEPTE: "ACCEPTE",
  REFUSE: "REFUSE",
  EXPIRE: "EXPIRE",
};

export async function updateQuoteStatusAction(quoteId: string, status: keyof typeof STATUS_TRANSITIONS): Promise<QuoteActionResult> {
  const user = await requirePermission(PERMISSIONS.SALES_CREATE);

  const { data: quote } = await supabase
    .from("quotes")
    .select("id, status")
    .eq("id", quoteId)
    .eq("business_id", user.businessId)
    .maybeSingle();
  if (!quote) return { error: "Devis introuvable" };
  if (quote.status === "CONVERTI") return { error: "Ce devis a déjà été converti en vente" };

  const { error } = await supabase
    .from("quotes")
    .update({ status: STATUS_TRANSITIONS[status], updated_at: new Date().toISOString() })
    .eq("id", quoteId);
  if (error) {
    console.error("[updateQuoteStatusAction] Échec de la mise à jour :", error.message);
    return { error: "Impossible de mettre à jour le statut" };
  }

  revalidatePath("/devis");
  revalidatePath(`/devis/${quoteId}`);
  return { success: "Statut mis à jour" };
}

export async function deleteQuoteAction(quoteId: string): Promise<QuoteActionResult> {
  const user = await requirePermission(PERMISSIONS.SALES_CREATE);

  const { data: quote } = await supabase
    .from("quotes")
    .select("id, status")
    .eq("id", quoteId)
    .eq("business_id", user.businessId)
    .maybeSingle();
  if (!quote) return { error: "Devis introuvable" };
  if (quote.status === "CONVERTI") return { error: "Impossible de supprimer un devis déjà converti en vente" };

  const { error } = await supabase.from("quotes").delete().eq("id", quoteId);
  if (error) {
    console.error("[deleteQuoteAction] Échec de la suppression :", error.message);
    return { error: "Impossible de supprimer ce devis" };
  }

  revalidatePath("/devis");
  return { success: "Devis supprimé" };
}

export type ConvertQuoteInput = {
  quoteId: string;
  paymentMethod: PaymentMethod;
  amountPaid: number;
};

export type ConvertQuoteResult = { success: true; saleId: string } | { success: false; error: string };

/** Convertit un devis en vente réelle — réutilise createSaleAction pour passer par les mêmes vérifications de stock/session qu'une vente normale. */
export async function convertQuoteToSaleAction(input: ConvertQuoteInput): Promise<ConvertQuoteResult> {
  try {
    return await convertQuoteImpl(input);
  } catch (e) {
    rethrowIfNavigationSignal(e);
    console.error("[convertQuoteToSaleAction] Erreur inattendue :", e);
    return { success: false, error: "Une erreur inattendue est survenue. Réessayez dans un instant." };
  }
}

async function convertQuoteImpl(input: ConvertQuoteInput): Promise<ConvertQuoteResult> {
  const user = await requirePermission(PERMISSIONS.SALES_CREATE);

  const { data: quote } = await supabase
    .from("quotes")
    .select("id, number, locationId:location_id, customerId:customer_id, discount, status, items:quote_items(productId:product_id, quantity, unitPrice:unit_price, discount)")
    .eq("id", input.quoteId)
    .eq("business_id", user.businessId)
    .maybeSingle();
  if (!quote) return { success: false, error: "Devis introuvable" };
  if (quote.status === "CONVERTI") return { success: false, error: "Ce devis a déjà été converti en vente" };
  if (quote.status === "REFUSE" || quote.status === "EXPIRE") {
    return { success: false, error: "Impossible de convertir un devis refusé ou expiré" };
  }

  const items = quote.items as unknown as Array<{ productId: string | null; quantity: number; unitPrice: number; discount: number }>;
  if (items.some((i) => !i.productId)) {
    return { success: false, error: "Un article du devis n'est plus rattaché à un produit du catalogue" };
  }

  const result = await createSaleAction({
    locationId: quote.locationId as string,
    items: items.map((i) => ({ productId: i.productId as string, quantity: i.quantity, unitPrice: i.unitPrice, discount: i.discount })),
    customerId: (quote.customerId as string) || undefined,
    discount: quote.discount as number,
    paymentMethod: input.paymentMethod,
    amountPaid: input.amountPaid,
    note: `Converti depuis le devis ${quote.number}`,
  });
  if (!result.success) return result;

  const { error } = await supabase
    .from("quotes")
    .update({ status: "CONVERTI", converted_sale_id: result.saleId, updated_at: new Date().toISOString() })
    .eq("id", input.quoteId);
  if (error) console.error("[convertQuoteToSaleAction] Échec du marquage du devis comme converti :", error.message);

  await logAction({ businessId: user.businessId, userId: user.id, action: "UPDATE", entity: "Quote", entityId: input.quoteId, details: `Converti en vente ${result.saleId}` });

  revalidatePath("/devis");
  revalidatePath(`/devis/${input.quoteId}`);
  return { success: true, saleId: result.saleId };
}
