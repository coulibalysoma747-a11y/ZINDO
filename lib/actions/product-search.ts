"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

function withQuantity<T extends { id: string }>(
  products: T[],
  stocks: { productId: string; quantity: number }[]
) {
  const stockMap = new Map(stocks.map((s) => [s.productId, s.quantity]));
  return products.map((p) => ({ ...p, quantity: stockMap.get(p.id) ?? 0 }));
}

export async function searchProductsAction(query: string, locationId: string) {
  const user = await requireUser();
  const where = {
    businessId: user.businessId,
    active: true,
    ...(query.trim().length > 0
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" as const } },
            { reference: { contains: query, mode: "insensitive" as const } },
            { barcode: { contains: query, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const products = await prisma.product.findMany({ where, orderBy: { name: "asc" }, take: 15 });
  const stocks = await prisma.productStock.findMany({
    where: { productId: { in: products.map((p) => p.id) }, locationId },
  });

  return withQuantity(products, stocks);
}

/**
 * Tous les produits disponibles en stock dans la boutique active — utilisé pour
 * afficher automatiquement la grille de la caisse (Vente / Caisse) à l'ouverture,
 * sans attendre une recherche.
 */
export async function getPosProductsAction(locationId: string) {
  const user = await requireUser();

  const stocks = await prisma.productStock.findMany({
    where: {
      locationId,
      quantity: { gt: 0 },
      product: { businessId: user.businessId, active: true },
    },
    include: { product: true },
    orderBy: { product: { name: "asc" } },
    take: 300,
  });

  return stocks.map((s) => ({ ...s.product, quantity: s.quantity }));
}

export async function findProductByExactCodeAction(code: string, locationId: string) {
  const user = await requireUser();
  const product = await prisma.product.findFirst({
    where: {
      businessId: user.businessId,
      active: true,
      OR: [{ barcode: code }, { reference: code }],
    },
  });
  if (!product) return null;

  const stock = await prisma.productStock.findUnique({
    where: { productId_locationId: { productId: product.id, locationId } },
  });

  return { ...product, quantity: stock?.quantity ?? 0 };
}
