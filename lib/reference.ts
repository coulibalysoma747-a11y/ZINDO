import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

async function nextSeq(
  tx: Tx,
  businessId: string,
  field: "nextProductSeq" | "nextSaleSeq" | "nextPurchaseSeq" | "nextSessionSeq" | "nextOnlineOrderSeq" | "nextInvoiceSeq"
) {
  const business = await tx.business.update({
    where: { id: businessId },
    data: { [field]: { increment: 1 } },
    select: { [field]: true },
  });
  return (business as unknown as Record<string, number>)[field] - 1;
}

function pad(n: number) {
  return String(n).padStart(6, "0");
}

export async function generateProductReference(businessId: string, tx: Tx = prisma) {
  const seq = await nextSeq(tx, businessId, "nextProductSeq");
  return `ZND-${pad(seq)}`;
}

export async function generateSaleNumber(businessId: string, tx: Tx = prisma) {
  const seq = await nextSeq(tx, businessId, "nextSaleSeq");
  return `ZND-V-${pad(seq)}`;
}

export async function generatePurchaseNumber(businessId: string, tx: Tx = prisma) {
  const seq = await nextSeq(tx, businessId, "nextPurchaseSeq");
  return `ZND-A-${pad(seq)}`;
}

export async function generateSessionNumber(businessId: string, tx: Tx = prisma) {
  const seq = await nextSeq(tx, businessId, "nextSessionSeq");
  return `ZND-C-${pad(seq)}`;
}

export async function generateOnlineOrderNumber(businessId: string, tx: Tx = prisma) {
  const seq = await nextSeq(tx, businessId, "nextOnlineOrderSeq");
  return `ZND-CMD-${pad(seq)}`;
}

export async function generateSubscriptionInvoiceNumber(businessId: string, tx: Tx = prisma) {
  const seq = await nextSeq(tx, businessId, "nextInvoiceSeq");
  return `ZND-FAC-${pad(seq)}`;
}

export function generateInventoryReference() {
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(
    d.getDate()
  ).padStart(2, "0")}-${String(d.getHours()).padStart(2, "0")}${String(
    d.getMinutes()
  ).padStart(2, "0")}${String(d.getSeconds()).padStart(2, "0")}`;
  return `INV-${stamp}`;
}
