"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { logAction } from "@/lib/audit";
import { checkCancelRules } from "@/lib/sale-rules";
import { getSaleReturnInfo, isSaleReturnEnabled } from "@/lib/sale-returns";
import { recordStockMovements, insertSaleItems } from "@/lib/actions/sales";
import { rethrowIfNavigationSignal } from "@/lib/action-errors";

export type RefundMethod = "ESPECES" | "MOBILE_MONEY" | "CARTE" | "AUTRE";

export type CreateSaleReturnInput = {
  saleId: string;
  lines: { key: string; quantity: number }[];
  refundMethod: RefundMethod;
  reason: string;
};

export type CreateSaleReturnResult =
  | { success: true; returnId: string; number: string; refund: number; debtReduced: number; cashRefund: number }
  | { success: false; error: string };

/**
 * Retour partiel : le client rapporte une partie des articles d'une vente.
 *
 * Enregistré comme une vente « miroir » en montants négatifs (document_type
 * RETOUR, return_of_sale_id = vente d'origine) : le chiffre d'affaires, la
 * caisse du jour et les rapports, qui additionnent les ventes, déduisent le
 * retour d'eux-mêmes. Le stock est réintégré en unités de base.
 *
 * Si le client doit encore de l'argent sur cette vente, le montant rendu
 * réduit d'abord sa dette ; seul le reste lui est remboursé (espèces, mobile
 * money...). Pour un échange, on fait ensuite une nouvelle vente normale.
 */
export async function createSaleReturnAction(input: CreateSaleReturnInput): Promise<CreateSaleReturnResult> {
  try {
    return await createSaleReturnImpl(input);
  } catch (e) {
    rethrowIfNavigationSignal(e);
    console.error("[createSaleReturnAction] Erreur inattendue :", e);
    return { success: false, error: "Une erreur inattendue est survenue. Réessayez dans un instant." };
  }
}

async function createSaleReturnImpl(input: CreateSaleReturnInput): Promise<CreateSaleReturnResult> {
  const user = await requirePermission(PERMISSIONS.SALES_CREATE);
  if (!(await isSaleReturnEnabled(user.businessId))) {
    return { success: false, error: "Le retour d'articles n'est pas activé pour ce commerce." };
  }
  const reason = input.reason?.trim() ?? "";
  if (!reason) return { success: false, error: "Indiquez le motif du retour." };
  // Mêmes règles que l'annulation (réservé à l'administrateur si activé).
  const ruleError = await checkCancelRules(user.businessId, user.role, reason);
  if (ruleError) return { success: false, error: ruleError };
  if (!["ESPECES", "MOBILE_MONEY", "CARTE", "AUTRE"].includes(input.refundMethod)) {
    return { success: false, error: "Moyen de remboursement invalide." };
  }

  const info = await getSaleReturnInfo(input.saleId, user.businessId);
  if (!info) return { success: false, error: "Vente introuvable." };
  const { sale } = info;
  if (sale.status === "ANNULEE") return { success: false, error: "Cette vente est annulée." };
  if (sale.documentType === "RETOUR" || sale.returnOfSaleId) {
    return { success: false, error: "On ne peut pas faire un retour sur un bon de retour." };
  }
  if (info.hasVehicleUnits) {
    return { success: false, error: "Vente d'engins avec numéro de châssis : utilisez « Annuler la vente »." };
  }

  const byKey = new Map(info.lines.map((l) => [l.key, l]));
  const chosen: { line: (typeof info.lines)[number]; quantity: number }[] = [];
  for (const l of input.lines) {
    const quantity = Math.floor(Number(l.quantity));
    if (!quantity || quantity <= 0) continue;
    const line = byKey.get(l.key);
    if (!line) return { success: false, error: "Article introuvable dans cette vente." };
    const available = line.soldQty - line.returnedQty;
    if (quantity > available) {
      return { success: false, error: `${line.name} : ${available} au maximum peut être rendu.` };
    }
    chosen.push({ line, quantity });
  }
  if (chosen.length === 0) return { success: false, error: "Choisissez au moins un article à reprendre." };

  const refund = Math.round(chosen.reduce((s, c) => s + c.line.unitRefund * c.quantity, 0));
  const debtReduced = Math.min(refund, info.remainingDebt);
  const cashRefund = refund - debtReduced;

  // Caisse ouverte de la boutique (de préférence celle de l'utilisateur,
  // pour la « caisse à deux ») : c'est elle qui rend l'argent.
  const { data: sessions } = await supabase
    .from("cash_sessions")
    .select("id, userId:user_id")
    .eq("business_id", user.businessId)
    .eq("location_id", sale.locationId)
    .eq("status", "OUVERTE");
  const session = (sessions ?? []).find((s) => s.userId === user.id) ?? sessions?.[0];
  if (!session) return { success: false, error: "Ouvrez une session de caisse avant d'enregistrer un retour." };

  let number = `${sale.number}-R${info.returns.length + 1}`;
  const insertReturn = () =>
    supabase
      .from("sales")
      .insert({
        business_id: user.businessId,
        location_id: sale.locationId,
        number,
        customer_id: sale.customerId,
        user_id: user.id,
        subtotal: -refund,
        discount: 0,
        total: -refund,
        amount_paid: -cashRefund,
        payment_method: cashRefund > 0 ? input.refundMethod : "CREDIT",
        status: "PAYEE",
        document_type: "RETOUR",
        note: `Retour sur la vente ${sale.number} — motif : ${reason}${debtReduced > 0 ? ` — dette réduite de ${debtReduced}` : ""}`,
        session_id: session.id,
        return_of_sale_id: sale.id,
      })
      .select("id")
      .single();
  let { data: ret, error: retError } = await insertReturn();
  if (retError && /duplicate|unique/i.test(retError.message)) {
    number = `${sale.number}-R${Date.now().toString(36).slice(-4).toUpperCase()}`;
    ({ data: ret, error: retError } = await insertReturn());
  }
  if (retError || !ret) {
    console.error("[createSaleReturnAction] Échec de l'enregistrement du retour :", retError?.message);
    return { success: false, error: "Impossible d'enregistrer le retour." };
  }

  const { error: itemsError } = await insertSaleItems(
    chosen.map(({ line, quantity }) => ({
      sale_id: ret.id as string,
      product_id: line.productId,
      quantity: -quantity,
      unit_price: line.unitPrice,
      unit_cost: line.unitCost,
      discount: 0,
      total: -Math.round(line.unitRefund * quantity),
      packaging_unit_id: line.packagingUnitId,
      multiplier: line.multiplier,
      unit_label: line.unitLabel,
    }))
  );
  if (itemsError) {
    // Sans ses lignes, le retour fausserait les comptes : on l'annule.
    console.error("[createSaleReturnAction] Échec des lignes du retour :", itemsError.message);
    await supabase.from("sales").delete().eq("id", ret.id);
    return { success: false, error: "Impossible d'enregistrer le retour." };
  }

  await recordStockMovements(
    chosen.map(({ line, quantity }) => ({ productId: line.productId, quantity: quantity * line.multiplier })),
    {
      businessId: user.businessId,
      locationId: sale.locationId,
      userId: user.id,
      direction: "IN",
      reason: "RETOUR_CLIENT",
      note: `Retour ${number} sur la vente ${sale.number} — ${reason}`,
    }
  );

  if (debtReduced > 0) {
    const newPaid = sale.amountPaid + debtReduced;
    const status = newPaid >= sale.total ? "PAYEE" : newPaid > 0 ? "PARTIELLE" : "CREDIT";
    const { error } = await supabase.from("sales").update({ amount_paid: newPaid, status }).eq("id", sale.id);
    if (error) console.error("[createSaleReturnAction] Échec de la réduction de la dette :", error.message);
  }

  await logAction({
    businessId: user.businessId,
    userId: user.id,
    action: "CREATE",
    entity: "Sale",
    entityId: ret.id as string,
    details: `Retour ${number} sur ${sale.number} : ${refund} (dette -${debtReduced}, remboursé ${cashRefund}) — ${reason}`,
  });

  revalidatePath("/ventes/historique");
  revalidatePath(`/ventes/${sale.id}`);
  revalidatePath("/produits");
  revalidatePath("/dashboard");
  revalidatePath("/credits");
  if (sale.customerId) revalidatePath(`/clients/${sale.customerId}`);

  return { success: true, returnId: ret.id as string, number, refund, debtReduced, cashRefund };
}
