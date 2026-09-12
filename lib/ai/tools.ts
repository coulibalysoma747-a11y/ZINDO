import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { startOfToday, startOfWeek, startOfMonth } from "@/lib/format";

type PeriodKey = "today" | "week" | "month" | "all";

function periodStart(period: PeriodKey): Date | undefined {
  if (period === "today") return startOfToday();
  if (period === "week") return startOfWeek();
  if (period === "month") return startOfMonth();
  return undefined;
}

export const ASSISTANT_TOOLS: Anthropic.Tool[] = [
  {
    name: "get_dashboard_summary",
    description:
      "Vue d'ensemble de la boutique active : chiffre d'affaires du jour et du mois, valeur du stock, nombre de produits, nombre de produits en rupture ou à faible stock.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "get_top_selling_products",
    description:
      "Liste des produits les plus vendus sur une période, avec quantité vendue, chiffre d'affaires généré, bénéfice total et marge en %. Utilise sortBy='profit' pour répondre aux questions sur la rentabilité.",
    input_schema: {
      type: "object",
      properties: {
        period: { type: "string", enum: ["today", "week", "month", "all"], description: "Période à analyser (défaut: month)" },
        sortBy: { type: "string", enum: ["quantity", "revenue", "profit"], description: "Critère de tri (défaut: quantity)" },
        limit: { type: "number", description: "Nombre de produits à retourner (défaut: 10, max 20)" },
      },
      required: [],
    },
  },
  {
    name: "get_stock_levels",
    description:
      "Niveaux de stock actuels des produits de la boutique active. Peut filtrer par nom de produit et/ou ne retourner que les produits en rupture ou en stock faible.",
    input_schema: {
      type: "object",
      properties: {
        search: { type: "string", description: "Filtre par nom de produit (recherche partielle, insensible à la casse)" },
        onlyLowOrOut: { type: "boolean", description: "Si true, ne retourne que les produits en rupture ou sous leur seuil minimum" },
      },
      required: [],
    },
  },
  {
    name: "get_sales_trend_by_category",
    description:
      "Compare le chiffre d'affaires de chaque catégorie de produits ce mois-ci par rapport au mois précédent, avec le pourcentage d'évolution.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "get_credit_summary",
    description:
      "Total des créances clients (ventes à crédit non totalement payées) et liste des clients qui doivent le plus d'argent au commerce.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "get_low_margin_products",
    description:
      "Produits qui se vendent bien ce mois-ci mais dont la marge (%) est faible — candidats à une révision de prix de vente.",
    input_schema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Nombre de produits à retourner (défaut: 5)" },
      },
      required: [],
    },
  },
];

export function createToolExecutor(businessId: string, locationId: string, currency: string) {
  return async function executeTool(name: string, input: Record<string, unknown>): Promise<string> {
    switch (name) {
      case "get_dashboard_summary": {
        const today = startOfToday();
        const monthStart = startOfMonth();
        const [salesToday, salesMonth, stocks] = await Promise.all([
          prisma.sale.aggregate({
            where: { businessId, locationId, status: { not: "ANNULEE" }, createdAt: { gte: today } },
            _sum: { total: true },
            _count: true,
          }),
          prisma.sale.aggregate({
            where: { businessId, locationId, status: { not: "ANNULEE" }, createdAt: { gte: monthStart } },
            _sum: { total: true },
          }),
          prisma.productStock.findMany({
            where: { locationId, product: { businessId, active: true } },
            include: { product: { select: { purchasePrice: true, minStock: true } } },
          }),
        ]);
        const stockValue = stocks.reduce((s, st) => s + st.quantity * st.product.purchasePrice, 0);
        const outOfStock = stocks.filter((s) => s.quantity <= 0).length;
        const lowStock = stocks.filter((s) => s.quantity > 0 && s.quantity <= s.product.minStock).length;
        return JSON.stringify({
          currency,
          ventesDuJour: salesToday._sum.total ?? 0,
          nombreVentesDuJour: salesToday._count,
          ventesDuMois: salesMonth._sum.total ?? 0,
          valeurStock: stockValue,
          produitsEnStock: stocks.filter((s) => s.quantity > 0).length,
          produitsEnRupture: outOfStock,
          produitsAFaibleStock: lowStock,
        });
      }

      case "get_top_selling_products": {
        const period = (input.period as PeriodKey) ?? "month";
        const sortBy = (input.sortBy as "quantity" | "revenue" | "profit") ?? "quantity";
        const limit = Math.min(Number(input.limit) || 10, 20);
        const start = periodStart(period);

        const items = await prisma.saleItem.findMany({
          where: {
            sale: {
              businessId,
              locationId,
              status: { not: "ANNULEE" },
              ...(start ? { createdAt: { gte: start } } : {}),
            },
          },
          select: { quantity: true, total: true, unitCost: true, product: { select: { name: true } } },
        });

        const byProduct = new Map<string, { name: string; quantity: number; revenue: number; profit: number }>();
        for (const item of items) {
          const existing = byProduct.get(item.product.name);
          const profit = (item.total - item.unitCost * item.quantity);
          if (existing) {
            existing.quantity += item.quantity;
            existing.revenue += item.total;
            existing.profit += profit;
          } else {
            byProduct.set(item.product.name, {
              name: item.product.name,
              quantity: item.quantity,
              revenue: item.total,
              profit,
            });
          }
        }

        const rows = Array.from(byProduct.values()).map((r) => ({
          ...r,
          marginPercent: r.revenue > 0 ? Math.round((r.profit / r.revenue) * 1000) / 10 : 0,
        }));

        rows.sort((a, b) =>
          sortBy === "revenue" ? b.revenue - a.revenue : sortBy === "profit" ? b.profit - a.profit : b.quantity - a.quantity
        );

        return JSON.stringify({ currency, periode: period, produits: rows.slice(0, limit) });
      }

      case "get_stock_levels": {
        const search = typeof input.search === "string" ? input.search : undefined;
        const onlyLowOrOut = input.onlyLowOrOut === true;

        const stocks = await prisma.productStock.findMany({
          where: {
            locationId,
            product: {
              businessId,
              active: true,
              ...(search ? { name: { contains: search, mode: "insensitive" as const } } : {}),
            },
          },
          include: { product: { select: { name: true, unit: true, minStock: true } } },
          orderBy: { product: { name: "asc" } },
          take: 50,
        });

        const rows = stocks
          .map((s) => ({
            nom: s.product.name,
            quantite: s.quantity,
            unite: s.product.unit,
            seuilMinimum: s.product.minStock,
            statut: s.quantity <= 0 ? "rupture" : s.quantity <= s.product.minStock ? "faible" : "ok",
          }))
          .filter((r) => !onlyLowOrOut || r.statut !== "ok");

        return JSON.stringify({ produits: rows });
      }

      case "get_sales_trend_by_category": {
        const currentStart = startOfMonth();
        const previousStart = new Date(currentStart.getFullYear(), currentStart.getMonth() - 1, 1);

        const [currentItems, previousItems] = await Promise.all([
          prisma.saleItem.findMany({
            where: { sale: { businessId, locationId, status: { not: "ANNULEE" }, createdAt: { gte: currentStart } } },
            select: { total: true, product: { select: { category: { select: { name: true } } } } },
          }),
          prisma.saleItem.findMany({
            where: {
              sale: {
                businessId,
                locationId,
                status: { not: "ANNULEE" },
                createdAt: { gte: previousStart, lt: currentStart },
              },
            },
            select: { total: true, product: { select: { category: { select: { name: true } } } } },
          }),
        ]);

        function sumByCategory(items: typeof currentItems) {
          const map = new Map<string, number>();
          for (const item of items) {
            const name = item.product.category?.name ?? "Sans catégorie";
            map.set(name, (map.get(name) ?? 0) + item.total);
          }
          return map;
        }

        const current = sumByCategory(currentItems);
        const previous = sumByCategory(previousItems);
        const categories = new Set([...current.keys(), ...previous.keys()]);

        const rows = Array.from(categories).map((name) => {
          const cur = current.get(name) ?? 0;
          const prev = previous.get(name) ?? 0;
          const percentChange = prev > 0 ? Math.round(((cur - prev) / prev) * 1000) / 10 : null;
          return { categorie: name, moisEnCours: cur, moisPrecedent: prev, evolutionPourcent: percentChange };
        });

        return JSON.stringify({ currency, categories: rows });
      }

      case "get_credit_summary": {
        const sales = await prisma.sale.findMany({
          where: { businessId, locationId, status: { in: ["CREDIT", "PARTIELLE"] } },
          include: { customer: true },
        });

        const byCustomer = new Map<string, { name: string; amount: number; since: Date }>();
        for (const sale of sales) {
          if (!sale.customer) continue;
          const remaining = sale.total - sale.amountPaid;
          if (remaining <= 0) continue;
          const existing = byCustomer.get(sale.customer.id);
          if (existing) {
            existing.amount += remaining;
            if (sale.createdAt < existing.since) existing.since = sale.createdAt;
          } else {
            byCustomer.set(sale.customer.id, { name: sale.customer.name, amount: remaining, since: sale.createdAt });
          }
        }

        const rows = Array.from(byCustomer.values()).sort((a, b) => b.amount - a.amount);
        return JSON.stringify({
          currency,
          totalCreances: rows.reduce((s, r) => s + r.amount, 0),
          clients: rows.slice(0, 10).map((r) => ({ nom: r.name, montantDu: r.amount, depuis: r.since.toISOString().slice(0, 10) })),
        });
      }

      case "get_low_margin_products": {
        const limit = Math.min(Number(input.limit) || 5, 15);
        const currentStart = startOfMonth();

        const items = await prisma.saleItem.findMany({
          where: { sale: { businessId, locationId, status: { not: "ANNULEE" }, createdAt: { gte: currentStart } } },
          select: {
            quantity: true,
            product: { select: { name: true, salePrice: true, purchasePrice: true } },
          },
        });

        const byProduct = new Map<string, { name: string; qty: number; salePrice: number; purchasePrice: number }>();
        for (const item of items) {
          const existing = byProduct.get(item.product.name);
          if (existing) existing.qty += item.quantity;
          else
            byProduct.set(item.product.name, {
              name: item.product.name,
              qty: item.quantity,
              salePrice: item.product.salePrice,
              purchasePrice: item.product.purchasePrice,
            });
        }

        const rows = Array.from(byProduct.values())
          .filter((r) => r.salePrice > 0)
          .map((r) => ({
            nom: r.name,
            quantiteVendue: r.qty,
            margePourcent: Math.round(((r.salePrice - r.purchasePrice) / r.salePrice) * 1000) / 10,
          }))
          .sort((a, b) => a.margePourcent - b.margePourcent)
          .slice(0, limit);

        return JSON.stringify({ produits: rows });
      }

      default:
        return JSON.stringify({ error: `Outil inconnu : ${name}` });
    }
  };
}
