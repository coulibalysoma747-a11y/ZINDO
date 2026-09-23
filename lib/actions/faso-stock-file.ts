"use server";

import { revalidatePath } from "next/cache";
import { requirePermission, hasPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { logAction } from "@/lib/audit";
import { getCurrentLocation } from "@/lib/location";
import { isFeatureEnabled, registerFeatureFlag } from "@/lib/feature-flags";
import { readFirstSheet } from "@/lib/xlsx-read";
import {
  parseFasoStockExport,
  receiveFasoStockExport,
  buildFasoStockImportFile,
  type FasoReceiveResult,
  type FasoSendResult,
} from "@/lib/faso-stock-file-sync";

/**
 * Synchro FasoStock par fichiers (voir lib/faso-stock-file-sync.ts) :
 * nouvelle fonctionnalité, désactivée par défaut tant qu'elle n'est pas
 * activée depuis /admin/fonctionnalites. Clé privée au module (un fichier
 * "use server" n'exporte que des fonctions async).
 */
const FASO_FILE_SYNC_FLAG = "synchro_fasostock_fichier";
const MAX_FILE_BYTES = 4 * 1024 * 1024;

export async function ensureFasoFileSyncFlagRegistered() {
  await registerFeatureFlag(
    FASO_FILE_SYNC_FLAG,
    "Synchro FasoStock par fichiers",
    "Utiliser FasoStock et ZINDO en même temps sans clé API : réception de l'export Excel « Stock » de FasoStock (seules les différences sont appliquées) et envoi d'un fichier d'import FasoStock avec les changements faits dans ZINDO."
  );
}

async function requireFasoSyncAccess() {
  const user = await requirePermission(PERMISSIONS.STOCK_MANAGE);
  await ensureFasoFileSyncFlagRegistered();
  if (!(await isFeatureEnabled(FASO_FILE_SYNC_FLAG, user.businessId))) {
    return { ok: false, error: "La synchro FasoStock n'est pas activée pour votre commerce." } as const;
  }
  if (!(await hasPermission(user.businessId, user.role, PERMISSIONS.PRODUCTS_MANAGE, user.id))) {
    return { ok: false, error: "La synchro FasoStock nécessite aussi le droit de gérer les produits." } as const;
  }
  const location = await getCurrentLocation(user.businessId);
  if (!location) return { ok: false, error: "Aucune boutique trouvée." } as const;
  return { ok: true, user, location } as const;
}

export async function receiveFasoStockAction(_prev: unknown, formData: FormData): Promise<FasoReceiveResult> {
  const access = await requireFasoSyncAccess();
  if (!access.ok) return { success: false, error: access.error };
  const { user, location } = access;

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { success: false, error: "Choisissez le fichier Excel exporté de FasoStock" };
  if (file.size > MAX_FILE_BYTES) return { success: false, error: "Le fichier dépasse 4 Mo" };

  let sheet: string[][];
  try {
    sheet = readFirstSheet(new Uint8Array(await file.arrayBuffer()));
  } catch {
    return { success: false, error: "Fichier illisible : choisissez le fichier Excel (.xlsx) « Stock » exporté de FasoStock" };
  }
  const { rows, errors } = parseFasoStockExport(sheet);
  if (errors.length > 0) {
    return { success: false, error: `${errors.length} problème(s) dans le fichier — rien n'a été modifié`, rowErrors: errors.slice(0, 30) };
  }
  if (rows.length === 0) return { success: false, error: "Aucun produit dans le fichier" };

  const result = await receiveFasoStockExport({ businessId: user.businessId, userId: user.id, locationId: location.id, rows });
  if (result.success) {
    await logAction({
      businessId: user.businessId,
      userId: user.id,
      action: "STOCK_IN",
      entity: "Location",
      entityId: location.id,
      details: `Synchro FasoStock (réception) : ${result.stockChanged} stock(s) modifié(s), ${result.productsCreated} produit(s) créé(s) — ${location.name}`,
    });
    revalidatePath("/stock");
    revalidatePath("/produits");
  }
  return result;
}

export async function sendToFasoStockAction(): Promise<FasoSendResult> {
  const access = await requireFasoSyncAccess();
  if (!access.ok) return { success: false, error: access.error };
  const { user, location } = access;

  const result = await buildFasoStockImportFile({ businessId: user.businessId, locationId: location.id });
  if (result.success) {
    await logAction({
      businessId: user.businessId,
      userId: user.id,
      action: "STOCK_OUT",
      entity: "Location",
      entityId: location.id,
      details: `Synchro FasoStock (envoi) : fichier de ${result.rows} produit(s) — ${location.name}`,
    });
  }
  return result;
}
