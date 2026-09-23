"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { requirePermission, hasPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { logAction } from "@/lib/audit";
import { parseCsv } from "@/lib/csv";
import { generateProductReference } from "@/lib/reference";
import { isFeatureEnabled, registerFeatureFlag } from "@/lib/feature-flags";
import { getCurrentLocation } from "@/lib/location";
import { adjustStock } from "@/lib/stock";

/**
 * Colonne optionnelle "quantite" (reprise du stock depuis un autre logiciel,
 * ex. export FasoStock) : nouvelle fonctionnalité, désactivée par défaut
 * tant qu'elle n'est pas activée depuis /admin/fonctionnalites. Clé privée
 * au module (un fichier "use server" n'exporte que des fonctions async).
 */
const CSV_QUANTITIES_FLAG = "import_csv_quantites";

export async function ensureCsvQuantitiesFlagRegistered() {
  await registerFeatureFlag(
    CSV_QUANTITIES_FLAG,
    "Import CSV : quantités en stock",
    "Colonne optionnelle « quantite » dans l'import CSV du catalogue : fixe le stock de chaque produit dans la boutique courante (mouvement de correction tracé)."
  );
}

const EXPECTED_HEADER = [
  "reference",
  "nom",
  "categorie",
  "marque",
  "unite",
  "prix_achat",
  "prix_vente",
  "stock_minimum",
  "code_barres",
  "actif",
];

export type ImportCsvResult =
  | { success: true; created: number; updated: number; stockUpdated: number }
  | { success: false; error: string; rowErrors?: string[] };

type ParsedRow = {
  line: number;
  reference: string;
  name: string;
  categoryName: string | null;
  brand: string | null;
  unit: string;
  purchasePrice: number;
  salePrice: number;
  minStock: number;
  barcode: string | null;
  active: boolean;
  // null = colonne absente ou cellule vide : stock laissé tel quel.
  quantity: number | null;
};

/**
 * Import CSV du catalogue — tout ou rien : si une seule ligne est invalide,
 * rien n'est enregistré, pour ne jamais laisser un import partiel corrompre
 * silencieusement le catalogue. Colonnes attendues (voir /produits/export) :
 * reference,nom,categorie,marque,unite,prix_achat,prix_vente,stock_minimum,code_barres,actif
 */
export async function importProductsCsvAction(_prevState: unknown, formData: FormData): Promise<ImportCsvResult> {
  const user = await requirePermission(PERMISSIONS.PRODUCTS_MANAGE);

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { success: false, error: "Choisissez un fichier CSV" };
  if (file.size > 5 * 1024 * 1024) return { success: false, error: "Le fichier dépasse 5 Mo" };

  const text = await file.text();
  const rows = parseCsv(text);
  if (rows.length === 0) return { success: false, error: "Fichier vide" };

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const missingColumns = ["reference", "nom", "prix_vente"].filter((c) => !header.includes(c));
  if (missingColumns.length > 0) {
    return { success: false, error: `Colonnes manquantes : ${missingColumns.join(", ")} (attendu : ${EXPECTED_HEADER.join(",")})` };
  }
  const colIndex = (col: string) => header.indexOf(col);

  const hasQuantityColumn = header.includes("quantite");
  if (hasQuantityColumn) {
    await ensureCsvQuantitiesFlagRegistered();
    if (!(await isFeatureEnabled(CSV_QUANTITIES_FLAG, user.businessId))) {
      return { success: false, error: "La colonne « quantite » n'est pas activée pour votre commerce — retirez-la du fichier" };
    }
    if (!(await hasPermission(user.businessId, user.role, PERMISSIONS.STOCK_MANAGE, user.id))) {
      return { success: false, error: "La colonne « quantite » nécessite le droit de gérer le stock" };
    }
  }

  const parsedRows: ParsedRow[] = [];
  const rowErrors: string[] = [];
  const seenReferences = new Set<string>();

  for (let i = 1; i < rows.length; i++) {
    const cells = rows[i];
    if (cells.every((c) => c.trim() === "")) continue;
    const line = i + 1;
    const reference = cells[colIndex("reference")]?.trim() || "";
    const name = cells[colIndex("nom")]?.trim() || "";
    const salePriceRaw = cells[colIndex("prix_vente")]?.trim() || "";

    if (!name) {
      rowErrors.push(`Ligne ${line} : nom manquant`);
      continue;
    }
    const salePrice = Number(salePriceRaw);
    if (!Number.isFinite(salePrice) || salePrice < 0) {
      rowErrors.push(`Ligne ${line} : prix de vente invalide ("${salePriceRaw}")`);
      continue;
    }
    const purchasePriceRaw = colIndex("prix_achat") >= 0 ? cells[colIndex("prix_achat")]?.trim() : "";
    const purchasePrice = purchasePriceRaw ? Number(purchasePriceRaw) : 0;
    if (!Number.isFinite(purchasePrice) || purchasePrice < 0) {
      rowErrors.push(`Ligne ${line} : prix d'achat invalide ("${purchasePriceRaw}")`);
      continue;
    }
    const minStockRaw = colIndex("stock_minimum") >= 0 ? cells[colIndex("stock_minimum")]?.trim() : "";
    const minStock = minStockRaw ? Number(minStockRaw) : 5;
    if (!Number.isInteger(minStock) || minStock < 0) {
      rowErrors.push(`Ligne ${line} : stock minimum invalide ("${minStockRaw}")`);
      continue;
    }

    const quantityRaw = hasQuantityColumn ? cells[colIndex("quantite")]?.trim() || "" : "";
    const quantity = quantityRaw ? Number(quantityRaw) : null;
    if (quantity !== null && (!Number.isInteger(quantity) || quantity < 0 || quantity > 2_000_000_000)) {
      rowErrors.push(`Ligne ${line} : quantité invalide ("${quantityRaw}")`);
      continue;
    }

    const effectiveReference = reference || null;
    if (effectiveReference) {
      const key = effectiveReference.toLowerCase();
      if (seenReferences.has(key)) {
        rowErrors.push(`Ligne ${line} : référence "${effectiveReference}" dupliquée dans le fichier`);
        continue;
      }
      seenReferences.add(key);
    }

    const activeRaw = colIndex("actif") >= 0 ? cells[colIndex("actif")]?.trim().toLowerCase() : "";
    const active = activeRaw === "" || activeRaw === "1" || activeRaw === "oui" || activeRaw === "true";

    parsedRows.push({
      line,
      reference: effectiveReference ?? "",
      name,
      categoryName: colIndex("categorie") >= 0 ? cells[colIndex("categorie")]?.trim() || null : null,
      brand: colIndex("marque") >= 0 ? cells[colIndex("marque")]?.trim() || null : null,
      unit: (colIndex("unite") >= 0 ? cells[colIndex("unite")]?.trim() : "") || "unité",
      purchasePrice,
      salePrice,
      minStock,
      barcode: colIndex("code_barres") >= 0 ? cells[colIndex("code_barres")]?.trim() || null : null,
      active,
      quantity,
    });
  }

  if (rowErrors.length > 0) {
    return { success: false, error: `${rowErrors.length} ligne(s) invalide(s) — aucune ligne n'a été importée`, rowErrors: rowErrors.slice(0, 30) };
  }
  if (parsedRows.length === 0) return { success: false, error: "Aucune ligne à importer" };

  const location = parsedRows.some((r) => r.quantity !== null) ? await getCurrentLocation(user.businessId) : null;
  if (parsedRows.some((r) => r.quantity !== null) && !location) {
    return { success: false, error: "Aucune boutique trouvée pour enregistrer les quantités" };
  }

  // Catégories/marques mentionnées : résolues (ou créées) une seule fois,
  // avant les upserts, plutôt qu'une requête par ligne.
  const categoryNames = [...new Set(parsedRows.map((r) => r.categoryName).filter((n): n is string => !!n))];
  const categoryIdByName = new Map<string, string>();
  if (categoryNames.length > 0) {
    const { data: existingCategories } = await supabase
      .from("categories")
      .select("id, name")
      .eq("business_id", user.businessId)
      .in("name", categoryNames);
    for (const c of existingCategories ?? []) categoryIdByName.set((c.name as string).toLowerCase(), c.id as string);
    const missingCategories = categoryNames.filter((n) => !categoryIdByName.has(n.toLowerCase()));
    if (missingCategories.length > 0) {
      const { data: created } = await supabase
        .from("categories")
        .insert(missingCategories.map((name) => ({ business_id: user.businessId, name })))
        .select("id, name");
      for (const c of created ?? []) categoryIdByName.set((c.name as string).toLowerCase(), c.id as string);
    }
  }

  const brandNames = [...new Set(parsedRows.map((r) => r.brand).filter((n): n is string => !!n))];
  if (brandNames.length > 0) {
    const { data: existingBrands } = await supabase
      .from("brands")
      .select("name")
      .eq("business_id", user.businessId)
      .in("name", brandNames);
    const existingBrandNames = new Set((existingBrands ?? []).map((b) => (b.name as string).toLowerCase()));
    const missingBrands = brandNames.filter((n) => !existingBrandNames.has(n.toLowerCase()));
    if (missingBrands.length > 0) {
      await supabase.from("brands").insert(missingBrands.map((name) => ({ business_id: user.businessId, name })));
    }
  }

  // Références déjà existantes (pour compter créations vs mises à jour) et
  // celles à générer automatiquement pour les lignes sans référence fournie.
  const providedReferences = parsedRows.filter((r) => r.reference).map((r) => r.reference);
  const { data: existingProducts } =
    providedReferences.length > 0
      ? await supabase.from("products").select("reference").eq("business_id", user.businessId).in("reference", providedReferences)
      : { data: [] as { reference: string }[] };
  const existingRefSet = new Set((existingProducts ?? []).map((p) => p.reference as string));

  let created = 0;
  let updated = 0;
  let stockUpdated = 0;
  const movements: Record<string, unknown>[] = [];
  for (const row of parsedRows) {
    const reference = row.reference || (await generateProductReference(user.businessId));
    const categoryId = row.categoryName ? categoryIdByName.get(row.categoryName.toLowerCase()) ?? null : null;

    const { data: product, error } = await supabase.from("products").upsert(
      {
        business_id: user.businessId,
        reference,
        name: row.name,
        category_id: categoryId,
        brand: row.brand,
        unit: row.unit,
        purchase_price: row.purchasePrice,
        sale_price: row.salePrice,
        min_stock: row.minStock,
        barcode: row.barcode,
        active: row.active,
      },
      { onConflict: "business_id,reference" }
    ).select("id").single();
    if (error) {
      console.error(`[importProductsCsvAction] Échec ligne ${row.line} :`, error.message);
      continue;
    }
    if (existingRefSet.has(reference)) updated++;
    else created++;

    if (row.quantity !== null && location && product) {
      const { data: stockRow } = await supabase
        .from("product_stocks")
        .select("quantity")
        .eq("product_id", product.id)
        .eq("location_id", location.id)
        .maybeSingle();
      const delta = row.quantity - ((stockRow?.quantity as number | undefined) ?? 0);
      if (delta !== 0) {
        const { oldStock, newStock } = await adjustStock({ productId: product.id as string, locationId: location.id, delta });
        movements.push({
          business_id: user.businessId,
          location_id: location.id,
          product_id: product.id,
          direction: delta > 0 ? "IN" : "OUT",
          reason: "CORRECTION",
          quantity: Math.abs(delta),
          old_stock: oldStock,
          new_stock: newStock,
          note: "Import CSV (quantité)",
          user_id: user.id,
        });
        stockUpdated++;
      }
    }
  }

  // Mouvements insérés par lots plutôt qu'un aller-retour par ligne.
  for (let i = 0; i < movements.length; i += 500) {
    const { error } = await supabase.from("stock_movements").insert(movements.slice(i, i + 500));
    if (error) console.error("[importProductsCsvAction] Échec d'insertion des mouvements :", error.message);
  }

  await logAction({
    businessId: user.businessId,
    userId: user.id,
    action: "CREATE",
    entity: "Product",
    details: `Import CSV : ${created} créé(s), ${updated} mis à jour${stockUpdated > 0 ? `, stock fixé pour ${stockUpdated} produit(s) — ${location?.name}` : ""}`,
  });

  revalidatePath("/produits");
  if (stockUpdated > 0) revalidatePath("/stock");
  return { success: true, created, updated, stockUpdated };
}
