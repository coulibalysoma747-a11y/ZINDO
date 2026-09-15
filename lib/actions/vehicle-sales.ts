"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { logAction } from "@/lib/audit";
import { adjustStock } from "@/lib/stock";
import { MOTO_ACTIVITY_KEY } from "@/lib/activities";
import { rethrowIfNavigationSignal } from "@/lib/action-errors";
import { createSaleAction } from "@/lib/actions/sales";
import type { PaymentMethod } from "@/lib/db-types";

export type VehicleSaleInput = {
  productId: string;
  locationId: string;
  /** Exemplaire déjà enregistré (voir vehicle_units), ou vide pour une saisie manuelle. */
  vehicleUnitId?: string;
  engineType?: string;
  condition?: string;
  brand?: string;
  modelLabel?: string;
  designation?: string;
  chassisNumber: string;
  engineNumber?: string;
  color?: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  customerId?: string;
  customerName?: string;
  customerCivility?: string;
  customerProfession?: string;
  customerIdType?: string;
  customerIdNumber?: string;
  customerAddress?: string;
  customerPhone?: string;
  customerEmail?: string;
  paymentMethod: PaymentMethod;
  amountPaid: number;
  documentType?: "TICKET" | "FACTURE";
  warranty: boolean;
  accessoryHelmet: boolean;
  accessoryToolKit: boolean;
  accessoryManual: boolean;
  accessoryKeys: boolean;
  accessorySafetyVest: boolean;
  accessoryOther?: string;
  internalReference?: string;
  observations?: string;
};

export type VehicleSaleResult = { success: true; saleId: string } | { success: false; error: string };

/**
 * Vente d'un engin depuis le module dédié (Vente Engin) : réutilise
 * createSaleAction pour l'encaissement lui-même, puis enregistre les
 * informations supplémentaires attendues sur une facture de vente de moto
 * (état, garantie, accessoires remis, pièce d'identité...) dans
 * vehicle_sale_details. Si aucun exemplaire déjà enregistré n'est choisi
 * (saisie manuelle du châssis), l'exemplaire est d'abord créé à la volée —
 * un commerçant qui reçoit et revend une moto le même jour n'a pas à passer
 * par la fiche produit pour l'enregistrer avant de pouvoir la vendre.
 */
export async function createVehicleSaleAction(input: VehicleSaleInput): Promise<VehicleSaleResult> {
  try {
    return await createVehicleSaleImpl(input);
  } catch (e) {
    rethrowIfNavigationSignal(e);
    console.error("[createVehicleSaleAction] Erreur inattendue :", e);
    return { success: false, error: "Une erreur inattendue est survenue. Réessayez dans un instant." };
  }
}

async function createVehicleSaleImpl(input: VehicleSaleInput): Promise<VehicleSaleResult> {
  const user = await requirePermission(PERMISSIONS.SALES_CREATE);
  if (user.business.activityKey !== MOTO_ACTIVITY_KEY) {
    return { success: false, error: "Ce module est réservé à l'activité Boutique de motos" };
  }
  if (!input.chassisNumber?.trim()) return { success: false, error: "Le numéro de châssis est requis" };

  let customerId = input.customerId;
  // Aucun client existant choisi mais un nom saisi : crée la fiche client à la
  // volée pour que la facture imprimée porte bien ce nom (la mention "DOIT"
  // provient de la vente liée à un vrai client, pas de ce formulaire).
  if (!customerId && input.customerName?.trim()) {
    const { data: newCustomer, error: customerError } = await supabase
      .from("customers")
      .insert({
        business_id: user.businessId,
        name: input.customerName.trim(),
        phone: input.customerPhone || null,
        email: input.customerEmail || null,
        address: input.customerAddress || null,
      })
      .select("id")
      .single();
    if (customerError || !newCustomer) {
      console.error("[createVehicleSaleAction] Échec de la création du client :", customerError?.message);
      return { success: false, error: "Impossible d'enregistrer le client" };
    }
    customerId = newCustomer.id as string;
  }

  let vehicleUnitId = input.vehicleUnitId;

  if (!vehicleUnitId) {
    const { data: existingChassis } = await supabase
      .from("vehicle_units")
      .select("id")
      .eq("business_id", user.businessId)
      .eq("chassis_number", input.chassisNumber.trim())
      .maybeSingle();
    if (existingChassis) return { success: false, error: "Ce numéro de châssis est déjà enregistré" };

    const { data: unit, error: insertError } = await supabase
      .from("vehicle_units")
      .insert({
        business_id: user.businessId,
        product_id: input.productId,
        location_id: input.locationId,
        chassis_number: input.chassisNumber.trim(),
        engine_number: input.engineNumber || null,
        color: input.color || null,
        cmc_available: false,
        status: "EN_STOCK",
      })
      .select("id")
      .single();
    if (insertError || !unit) {
      console.error("[createVehicleSaleAction] Échec de l'enregistrement de l'exemplaire :", insertError?.message);
      return { success: false, error: "Impossible d'enregistrer cet exemplaire" };
    }
    vehicleUnitId = unit.id as string;

    try {
      const { oldStock, newStock } = await adjustStock({ productId: input.productId, locationId: input.locationId, delta: 1 });
      await supabase.from("stock_movements").insert({
        business_id: user.businessId,
        location_id: input.locationId,
        product_id: input.productId,
        direction: "IN",
        reason: "ACHAT",
        quantity: 1,
        old_stock: oldStock,
        new_stock: newStock,
        user_id: user.id,
        note: `Enregistrement châssis ${input.chassisNumber.trim()} (saisie directe à la vente)`,
      });
    } catch (e) {
      console.error("[createVehicleSaleAction] Échec de l'ajustement du stock (enregistrement) :", e);
    }
  }

  const saleResult = await createSaleAction({
    locationId: input.locationId,
    items: [
      {
        productId: input.productId,
        quantity: input.quantity,
        unitPrice: input.unitPrice,
        discount: input.discount,
        vehicleUnitId,
      },
    ],
    customerId,
    discount: 0,
    paymentMethod: input.paymentMethod,
    amountPaid: input.amountPaid,
    documentType: input.documentType,
  });
  if (!saleResult.success) return saleResult;

  const { error: detailsError } = await supabase.from("vehicle_sale_details").insert({
    sale_id: saleResult.saleId,
    business_id: user.businessId,
    vehicle_unit_id: vehicleUnitId,
    engine_type: input.engineType || null,
    condition: input.condition || null,
    brand: input.brand || null,
    model_label: input.modelLabel || null,
    designation: input.designation || null,
    chassis_number: input.chassisNumber.trim(),
    engine_number: input.engineNumber || null,
    color: input.color || null,
    quantity: input.quantity,
    customer_name: input.customerName || null,
    customer_civility: input.customerCivility || null,
    customer_profession: input.customerProfession || null,
    customer_id_type: input.customerIdType || null,
    customer_id_number: input.customerIdNumber || null,
    customer_address: input.customerAddress || null,
    customer_phone: input.customerPhone || null,
    customer_email: input.customerEmail || null,
    warranty: input.warranty,
    accessory_helmet: input.accessoryHelmet,
    accessory_tool_kit: input.accessoryToolKit,
    accessory_manual: input.accessoryManual,
    accessory_keys: input.accessoryKeys,
    accessory_safety_vest: input.accessorySafetyVest,
    accessory_other: input.accessoryOther || null,
    internal_reference: input.internalReference || null,
    observations: input.observations || null,
  });
  if (detailsError) {
    console.error("[createVehicleSaleAction] Échec de l'enregistrement des détails de vente :", detailsError.message);
  }

  await logAction({ businessId: user.businessId, userId: user.id, action: "CREATE", entity: "VehicleSale", entityId: saleResult.saleId });
  revalidatePath("/vente-engin");

  return saleResult;
}

export type VehicleSaleListItem = {
  saleId: string;
  number: string;
  createdAt: string;
  customerLabel: string;
  chassisNumber: string | null;
  total: number;
};

export async function listVehicleSalesAction(): Promise<VehicleSaleListItem[]> {
  const user = await requirePermission(PERMISSIONS.SALES_VIEW);

  const { data } = await supabase
    .from("vehicle_sale_details")
    .select("chassisNumber:chassis_number, sale:sales(id, number, createdAt:created_at, total, customer:customers(name))")
    .eq("business_id", user.businessId)
    .order("created_at", { ascending: false })
    .limit(200);

  type Row = {
    chassisNumber: string | null;
    sale: { id: string; number: string; createdAt: string; total: number; customer: { name: string } | null } | null;
  };

  return ((data ?? []) as unknown as Row[])
    .filter((r) => r.sale)
    .map((r) => ({
      saleId: r.sale!.id,
      number: r.sale!.number,
      createdAt: r.sale!.createdAt,
      customerLabel: r.sale!.customer?.name ?? "Client de passage",
      chassisNumber: r.chassisNumber,
      total: r.sale!.total,
    }));
}
