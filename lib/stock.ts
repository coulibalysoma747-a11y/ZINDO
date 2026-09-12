import "server-only";
import type { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

export async function getStockQuantity(tx: Tx, productId: string, locationId: string) {
  const row = await tx.productStock.findUnique({
    where: { productId_locationId: { productId, locationId } },
  });
  return row?.quantity ?? 0;
}

/**
 * Applique un delta (positif ou négatif) au stock d'un produit dans une boutique,
 * en créant la ligne ProductStock si elle n'existe pas encore. Retourne l'ancien
 * et le nouveau stock pour l'enregistrement du mouvement associé.
 */
export async function adjustStock(
  tx: Tx,
  params: { productId: string; locationId: string; delta: number }
) {
  const { productId, locationId, delta } = params;
  const existing = await tx.productStock.findUnique({
    where: { productId_locationId: { productId, locationId } },
  });
  const oldStock = existing?.quantity ?? 0;
  const newStock = oldStock + delta;

  if (existing) {
    await tx.productStock.update({ where: { id: existing.id }, data: { quantity: newStock } });
  } else {
    await tx.productStock.create({ data: { productId, locationId, quantity: newStock } });
  }

  return { oldStock, newStock };
}
