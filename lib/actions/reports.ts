import "server-only";
import { prisma } from "@/lib/prisma";

export async function getSalesReport(businessId: string, locationId: string, dateFrom?: Date, dateTo?: Date) {
  const dateFilter = dateFrom ? { gte: dateFrom, ...(dateTo ? { lt: dateTo } : {}) } : undefined;

  const sales = await prisma.sale.findMany({
    where: {
      businessId,
      locationId,
      status: { not: "ANNULEE" },
      ...(dateFilter ? { createdAt: dateFilter } : {}),
    },
    include: { items: true },
  });

  const revenue = sales.reduce((s, sale) => s + sale.total, 0);
  const profit = sales.reduce(
    (s, sale) => s + sale.items.reduce((si, i) => si + (i.unitPrice - i.unitCost) * i.quantity, 0),
    0
  );
  const itemsSold = sales.reduce((s, sale) => s + sale.items.reduce((si, i) => si + i.quantity, 0), 0);

  const byProduct = new Map<string, { productId: string; quantity: number; total: number }>();
  for (const sale of sales) {
    for (const item of sale.items) {
      const existing = byProduct.get(item.productId);
      if (existing) {
        existing.quantity += item.quantity;
        existing.total += item.total;
      } else {
        byProduct.set(item.productId, { productId: item.productId, quantity: item.quantity, total: item.total });
      }
    }
  }
  const products = await prisma.product.findMany({
    where: { id: { in: Array.from(byProduct.keys()) } },
    select: { id: true, name: true },
  });
  const nameMap = new Map(products.map((p) => [p.id, p.name]));
  const topProducts = Array.from(byProduct.values())
    .map((p) => ({ ...p, name: nameMap.get(p.productId) ?? "Produit supprimé" }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10);

  return { revenue, profit, salesCount: sales.length, itemsSold, topProducts };
}

export async function getStockReport(businessId: string, locationId: string) {
  const stocks = await prisma.productStock.findMany({
    where: { locationId, product: { businessId, active: true } },
    include: { product: { include: { category: true } } },
    orderBy: { product: { name: "asc" } },
  });

  const stockValue = stocks.reduce((s, st) => s + st.quantity * st.product.purchasePrice, 0);
  const potentialValue = stocks.reduce((s, st) => s + st.quantity * st.product.salePrice, 0);
  const outOfStock = stocks.filter((st) => st.quantity <= 0).map((st) => st.product);
  const lowStock = stocks
    .filter((st) => st.quantity > 0 && st.quantity <= st.product.minStock)
    .map((st) => ({ ...st.product, quantity: st.quantity }));

  return { stockValue, potentialValue, outOfStock, lowStock };
}

export async function getPurchasesReport(businessId: string, locationId: string, dateFrom?: Date, dateTo?: Date) {
  const dateFilter = dateFrom ? { gte: dateFrom, ...(dateTo ? { lt: dateTo } : {}) } : undefined;

  const purchases = await prisma.purchase.findMany({
    where: { businessId, locationId, ...(dateFilter ? { createdAt: dateFilter } : {}) },
    include: { supplier: true, items: { include: { product: true } } },
  });

  const total = purchases.reduce((s, p) => s + p.total, 0);
  const bySupplier = new Map<string, { name: string; total: number }>();
  for (const p of purchases) {
    const existing = bySupplier.get(p.supplierId);
    if (existing) existing.total += p.total;
    else bySupplier.set(p.supplierId, { name: p.supplier.name, total: p.total });
  }

  return {
    total,
    purchaseCount: purchases.length,
    suppliers: Array.from(bySupplier.values()).sort((a, b) => b.total - a.total),
  };
}
