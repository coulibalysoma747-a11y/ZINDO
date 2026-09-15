"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { MOTO_ACTIVITY_KEY } from "@/lib/activities";
import { rethrowIfNavigationSignal } from "@/lib/action-errors";
import { deriveRegistrationStatus, type RegistrationStatus } from "@/lib/vehicle-registration-status";

export type { RegistrationStatus };

type RegistrationRow = {
  id: string;
  saleId: string;
  vehicleUnitId: string | null;
  cmcAvailable: boolean;
  cmcNumber: string | null;
  cmcDate: string | null;
  wwNumber: string | null;
  wwIssuedDate: string | null;
  wwHandedToClient: boolean;
  ministryDepositDate: string | null;
  ministryDepositReference: string | null;
  receiptNumber: string | null;
  receiptReceivedDate: string | null;
  receiptHandedToClient: boolean;
  grayCardNumber: string | null;
  grayCardReceivedDate: string | null;
  grayCardHandedToClient: boolean;
  notes: string | null;
  createdAt: string;
};

export type VehicleRegistrationListItem = {
  id: string;
  saleId: string;
  saleNumber: string;
  status: RegistrationStatus;
  customerLabel: string;
  designation: string;
  chassisNumber: string | null;
  total: number;
  remaining: number;
  cmcAvailable: boolean;
  wwIssued: boolean;
  ministryDeposited: boolean;
  receiptReceived: boolean;
  receiptHanded: boolean;
  grayCardReceived: boolean;
  grayCardHanded: boolean;
  createdAt: string;
};

export type VehicleRegistrationCounts = {
  total: number;
  enAttentePaiement: number;
  enAttentePaiementDue: number;
  wwAEmettre: number;
  wwEmis: number;
  deposeMinistere: number;
  recepisseARemettre: number;
  recepisseRemis: number;
  carteGriseARemettre: number;
  termines: number;
  sansCmc: number;
};

export async function listVehicleRegistrationsAction(): Promise<{
  dossiers: VehicleRegistrationListItem[];
  counts: VehicleRegistrationCounts;
}> {
  const user = await requirePermission(PERMISSIONS.SALES_VIEW);

  const { data: registrations } = await supabase
    .from("vehicle_registrations")
    .select(
      "id, saleId:sale_id, vehicleUnitId:vehicle_unit_id, cmcAvailable:cmc_available, cmcNumber:cmc_number, cmcDate:cmc_date, " +
        "wwNumber:ww_number, wwIssuedDate:ww_issued_date, wwHandedToClient:ww_handed_to_client, " +
        "ministryDepositDate:ministry_deposit_date, ministryDepositReference:ministry_deposit_reference, " +
        "receiptNumber:receipt_number, receiptReceivedDate:receipt_received_date, receiptHandedToClient:receipt_handed_to_client, " +
        "grayCardNumber:gray_card_number, grayCardReceivedDate:gray_card_received_date, grayCardHandedToClient:gray_card_handed_to_client, " +
        "notes, createdAt:created_at"
    )
    .eq("business_id", user.businessId)
    .order("created_at", { ascending: false })
    .limit(300);

  const rows = (registrations ?? []) as unknown as RegistrationRow[];
  if (rows.length === 0) {
    return {
      dossiers: [],
      counts: {
        total: 0,
        enAttentePaiement: 0,
        enAttentePaiementDue: 0,
        wwAEmettre: 0,
        wwEmis: 0,
        deposeMinistere: 0,
        recepisseARemettre: 0,
        recepisseRemis: 0,
        carteGriseARemettre: 0,
        termines: 0,
        sansCmc: 0,
      },
    };
  }

  const saleIds = rows.map((r) => r.saleId);
  const [{ data: sales }, { data: details }] = await Promise.all([
    supabase
      .from("sales")
      .select("id, number, total, amountPaid:amount_paid, customer:customers(name)")
      .in("id", saleIds),
    supabase.from("vehicle_sale_details").select("saleId:sale_id, designation, chassisNumber:chassis_number, customerName:customer_name").in("sale_id", saleIds),
  ]);

  type SaleInfo = { id: string; number: string; total: number; amountPaid: number; customer: { name: string } | null };
  const saleMap = new Map(((sales ?? []) as unknown as SaleInfo[]).map((s) => [s.id, s]));
  type DetailInfo = { saleId: string; designation: string | null; chassisNumber: string | null; customerName: string | null };
  const detailMap = new Map(((details ?? []) as unknown as DetailInfo[]).map((d) => [d.saleId, d]));

  const counts: VehicleRegistrationCounts = {
    total: rows.length,
    enAttentePaiement: 0,
    enAttentePaiementDue: 0,
    wwAEmettre: 0,
    wwEmis: 0,
    deposeMinistere: 0,
    recepisseARemettre: 0,
    recepisseRemis: 0,
    carteGriseARemettre: 0,
    termines: 0,
    sansCmc: 0,
  };

  const dossiers: VehicleRegistrationListItem[] = rows.map((r) => {
    const sale = saleMap.get(r.saleId);
    const total = sale?.total ?? 0;
    const remaining = Math.max(0, (sale?.total ?? 0) - (sale?.amountPaid ?? 0));
    const status = deriveRegistrationStatus(r, remaining);
    const detail = detailMap.get(r.saleId);

    if (status === "EN_ATTENTE_PAIEMENT") {
      counts.enAttentePaiement += 1;
      counts.enAttentePaiementDue += remaining;
    }
    if (status === "WW_A_EMETTRE") counts.wwAEmettre += 1;
    if (r.wwNumber || r.wwIssuedDate) counts.wwEmis += 1;
    if (r.ministryDepositDate || r.ministryDepositReference) counts.deposeMinistere += 1;
    if ((r.receiptNumber || r.receiptReceivedDate) && !r.receiptHandedToClient) counts.recepisseARemettre += 1;
    if (r.receiptHandedToClient) counts.recepisseRemis += 1;
    if ((r.grayCardNumber || r.grayCardReceivedDate) && !r.grayCardHandedToClient) counts.carteGriseARemettre += 1;
    if (status === "REMISE_AU_CLIENT") counts.termines += 1;
    if (!r.cmcAvailable) counts.sansCmc += 1;

    return {
      id: r.id,
      saleId: r.saleId,
      saleNumber: sale?.number ?? "",
      status,
      customerLabel: sale?.customer?.name ?? detail?.customerName ?? "Client de passage",
      designation: detail?.designation ?? "—",
      chassisNumber: detail?.chassisNumber ?? null,
      total,
      remaining,
      cmcAvailable: r.cmcAvailable,
      wwIssued: !!(r.wwNumber || r.wwIssuedDate),
      ministryDeposited: !!(r.ministryDepositDate || r.ministryDepositReference),
      receiptReceived: !!(r.receiptNumber || r.receiptReceivedDate),
      receiptHanded: r.receiptHandedToClient,
      grayCardReceived: !!(r.grayCardNumber || r.grayCardReceivedDate),
      grayCardHanded: r.grayCardHandedToClient,
      createdAt: r.createdAt,
    };
  });

  return { dossiers, counts };
}

export type VehicleRegistrationDetail = {
  id: string;
  saleId: string;
  saleNumber: string;
  total: number;
  remaining: number;
  cmcAvailable: boolean;
  cmcNumber: string | null;
  cmcDate: string | null;
  wwNumber: string | null;
  wwIssuedDate: string | null;
  wwHandedToClient: boolean;
  ministryDepositDate: string | null;
  ministryDepositReference: string | null;
  receiptNumber: string | null;
  receiptReceivedDate: string | null;
  receiptHandedToClient: boolean;
  grayCardNumber: string | null;
  grayCardReceivedDate: string | null;
  grayCardHandedToClient: boolean;
  notes: string | null;
  status: RegistrationStatus;
};

export async function getVehicleRegistrationAction(id: string): Promise<VehicleRegistrationDetail | null> {
  const user = await requirePermission(PERMISSIONS.SALES_VIEW);

  const { data } = await supabase
    .from("vehicle_registrations")
    .select(
      "id, saleId:sale_id, vehicleUnitId:vehicle_unit_id, cmcAvailable:cmc_available, cmcNumber:cmc_number, cmcDate:cmc_date, " +
        "wwNumber:ww_number, wwIssuedDate:ww_issued_date, wwHandedToClient:ww_handed_to_client, " +
        "ministryDepositDate:ministry_deposit_date, ministryDepositReference:ministry_deposit_reference, " +
        "receiptNumber:receipt_number, receiptReceivedDate:receipt_received_date, receiptHandedToClient:receipt_handed_to_client, " +
        "grayCardNumber:gray_card_number, grayCardReceivedDate:gray_card_received_date, grayCardHandedToClient:gray_card_handed_to_client, " +
        "notes, createdAt:created_at"
    )
    .eq("id", id)
    .eq("business_id", user.businessId)
    .maybeSingle();
  if (!data) return null;
  const row = data as unknown as RegistrationRow;

  const { data: sale } = await supabase.from("sales").select("number, total, amountPaid:amount_paid").eq("id", row.saleId).maybeSingle();
  const total = (sale?.total as number | undefined) ?? 0;
  const remaining = Math.max(0, total - ((sale?.amountPaid as number | undefined) ?? 0));

  return {
    id: row.id,
    saleId: row.saleId,
    saleNumber: (sale?.number as string | undefined) ?? "",
    total,
    remaining,
    cmcAvailable: row.cmcAvailable,
    cmcNumber: row.cmcNumber,
    cmcDate: row.cmcDate,
    wwNumber: row.wwNumber,
    wwIssuedDate: row.wwIssuedDate,
    wwHandedToClient: row.wwHandedToClient,
    ministryDepositDate: row.ministryDepositDate,
    ministryDepositReference: row.ministryDepositReference,
    receiptNumber: row.receiptNumber,
    receiptReceivedDate: row.receiptReceivedDate,
    receiptHandedToClient: row.receiptHandedToClient,
    grayCardNumber: row.grayCardNumber,
    grayCardReceivedDate: row.grayCardReceivedDate,
    grayCardHandedToClient: row.grayCardHandedToClient,
    notes: row.notes,
    status: deriveRegistrationStatus(row, remaining),
  };
}

export type VehicleRegistrationUpdateInput = {
  id: string;
  cmcAvailable: boolean;
  cmcNumber?: string;
  cmcDate?: string;
  wwNumber?: string;
  wwIssuedDate?: string;
  wwHandedToClient: boolean;
  ministryDepositDate?: string;
  ministryDepositReference?: string;
  receiptNumber?: string;
  receiptReceivedDate?: string;
  receiptHandedToClient: boolean;
  grayCardNumber?: string;
  grayCardReceivedDate?: string;
  grayCardHandedToClient: boolean;
  notes?: string;
};

export type VehicleRegistrationResult = { error?: string; success?: string };

export async function updateVehicleRegistrationAction(input: VehicleRegistrationUpdateInput): Promise<VehicleRegistrationResult> {
  try {
    return await updateVehicleRegistrationImpl(input);
  } catch (e) {
    rethrowIfNavigationSignal(e);
    console.error("[updateVehicleRegistrationAction] Erreur inattendue :", e);
    return { error: "Une erreur inattendue est survenue. Réessayez dans un instant." };
  }
}

async function updateVehicleRegistrationImpl(input: VehicleRegistrationUpdateInput): Promise<VehicleRegistrationResult> {
  const user = await requirePermission(PERMISSIONS.SALES_CREATE);
  if (user.business.activityKey !== MOTO_ACTIVITY_KEY) {
    return { error: "Ce module est réservé à l'activité Boutique de motos" };
  }

  const { data: dossier } = await supabase
    .from("vehicle_registrations")
    .select("id, saleId:sale_id")
    .eq("id", input.id)
    .eq("business_id", user.businessId)
    .maybeSingle();
  if (!dossier) return { error: "Dossier introuvable" };

  const { data: sale } = await supabase.from("sales").select("total, amountPaid:amount_paid").eq("id", dossier.saleId).maybeSingle();
  const remaining = Math.max(0, (sale?.total as number | undefined ?? 0) - (sale?.amountPaid as number | undefined ?? 0));

  if (remaining > 0 && (input.wwNumber || input.wwIssuedDate)) {
    return { error: "Le WW ne peut être émis que si la vente est soldée. Encaissez le reste depuis la page « Vente Engins »." };
  }
  if (input.wwHandedToClient && !input.wwNumber && !input.wwIssuedDate) {
    return { error: "Renseignez d'abord le WW émis (n° ou date) avant d'enregistrer la remise" };
  }
  if (input.receiptHandedToClient && !input.receiptNumber && !input.receiptReceivedDate) {
    return { error: "Renseignez d'abord le récépissé reçu (n° ou date) avant d'enregistrer la remise" };
  }
  if (input.grayCardHandedToClient && !input.grayCardNumber && !input.grayCardReceivedDate) {
    return { error: "Renseignez d'abord la carte grise reçue (n° ou date) avant d'enregistrer la remise" };
  }

  const { error } = await supabase
    .from("vehicle_registrations")
    .update({
      cmc_available: input.cmcAvailable,
      cmc_number: input.cmcNumber || null,
      cmc_date: input.cmcDate || null,
      ww_number: input.wwNumber || null,
      ww_issued_date: input.wwIssuedDate || null,
      ww_handed_to_client: input.wwHandedToClient,
      ministry_deposit_date: input.ministryDepositDate || null,
      ministry_deposit_reference: input.ministryDepositReference || null,
      receipt_number: input.receiptNumber || null,
      receipt_received_date: input.receiptReceivedDate || null,
      receipt_handed_to_client: input.receiptHandedToClient,
      gray_card_number: input.grayCardNumber || null,
      gray_card_received_date: input.grayCardReceivedDate || null,
      gray_card_handed_to_client: input.grayCardHandedToClient,
      notes: input.notes || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id);
  if (error) {
    console.error("[updateVehicleRegistrationAction] Échec de la mise à jour :", error.message);
    return { error: "Impossible d'enregistrer le dossier" };
  }

  revalidatePath("/immatriculation-engins");
  return { success: "Dossier enregistré" };
}
