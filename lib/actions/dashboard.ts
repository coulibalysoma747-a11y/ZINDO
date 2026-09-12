import "server-only";
import { prisma } from "@/lib/prisma";
import { startOfToday, startOfMonth } from "@/lib/format";

export async function getDashboardData(businessId: string, locationId: string) {
  const today = startOfToday();
  const monthStart = startOfMonth();

  const [salesToday, salesMonth, salesCountToday, stocks] = await Promise.all([
    prisma.sale.aggregate({
      where: { businessId, locationId, createdAt: { gte: today }, status: { not: "ANNULEE" } },
      _sum: { total: true },
    }),
    prisma.sale.aggregate({
      where: { businessId, locationId, createdAt: { gte: monthStart }, status: { not: "ANNULEE" } },
      _sum: { total: true },
    }),
    prisma.sale.count({
      where: { businessId, locationId, createdAt: { gte: today }, status: { not: "ANNULEE" } },
    }),
    prisma.productStock.findMany({
      where: { locationId, product: { businessId, active: true } },
      include: { product: { select: { id: true, name: true, purchasePrice: true, minStock: true } } },
    }),
  ]);

  const stockValue = stocks.reduce((sum, s) => sum + s.quantity * s.product.purchasePrice, 0);
  const productCount = stocks.filter((s) => s.quantity > 0).length;
  const lowStockProducts = stocks
    .filter((s) => s.quantity > 0 && s.quantity <= s.product.minStock)
    .map((s) => ({ id: s.product.id, name: s.product.name, quantity: s.quantity, minStock: s.product.minStock }));
  const outOfStockCount = stocks.filter((s) => s.quantity <= 0).length;

  const saleItemsToday = await prisma.saleItem.findMany({
    where: { sale: { businessId, locationId, createdAt: { gte: today }, status: { not: "ANNULEE" } } },
    select: { quantity: true, unitPrice: true, unitCost: true },
  });
  const profitToday = saleItemsToday.reduce(
    (sum, i) => sum + (i.unitPrice - i.unitCost) * i.quantity,
    0
  );
  const soldQtyToday = saleItemsToday.reduce((sum, i) => sum + i.quantity, 0);

  return {
    salesToday: salesToday._sum.total ?? 0,
    salesMonth: salesMonth._sum.total ?? 0,
    profitToday,
    productCount,
    stockValue,
    salesCountToday,
    soldQtyToday,
    lowStockProducts,
    outOfStockCount,
  };
}

export async function getTopProducts(businessId: string, locationId: string, limit = 5) {
  const monthStart = startOfMonth();
  const items = await prisma.saleItem.groupBy({
    by: ["productId"],
    where: {
      sale: { businessId, locationId, createdAt: { gte: monthStart }, status: { not: "ANNULEE" } },
    },
    _sum: { quantity: true, total: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: limit,
  });

  const products = await prisma.product.findMany({
    where: { id: { in: items.map((i) => i.productId) } },
    select: { id: true, name: true },
  });
  const nameMap = new Map(products.map((p) => [p.id, p.name]));

  return items.map((i) => ({
    productId: i.productId,
    name: nameMap.get(i.productId) ?? "Produit supprimé",
    quantity: i._sum.quantity ?? 0,
    total: i._sum.total ?? 0,
  }));
}

/** Valeur du stock pour chaque boutique/dépôt du commerce — vue d'ensemble multi-boutiques. */
export async function getLocationsStockOverview(businessId: string) {
  const locations = await prisma.location.findMany({
    where: { businessId, active: true },
    include: {
      stocks: { include: { product: { select: { purchasePrice: true } } } },
    },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });

  return locations.map((l) => ({
    id: l.id,
    name: l.name,
    type: l.type,
    stockValue: l.stocks.reduce((sum, s) => sum + s.quantity * s.product.purchasePrice, 0),
  }));
}
