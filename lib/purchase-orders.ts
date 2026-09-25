/** Demandes de prix / bons de commande fournisseur — constantes partagées client/serveur (voir lib/actions/purchase-orders.ts). */

export type PurchaseOrderStatus = "BROUILLON" | "ENVOYEE" | "PRIX_RECUS" | "CONFIRMEE" | "RECUE" | "ANNULEE";

export const PURCHASE_ORDER_STATUS_LABELS: Record<PurchaseOrderStatus, string> = {
  BROUILLON: "Brouillon",
  ENVOYEE: "Demande envoyée",
  PRIX_RECUS: "Prix reçus",
  CONFIRMEE: "Commande confirmée",
  RECUE: "Reçue",
  ANNULEE: "Annulée",
};

export const PURCHASE_ORDER_STATUS_TONES: Record<PurchaseOrderStatus, "zinc" | "blue" | "amber" | "emerald" | "red"> = {
  BROUILLON: "zinc",
  ENVOYEE: "blue",
  PRIX_RECUS: "amber",
  CONFIRMEE: "emerald",
  RECUE: "emerald",
  ANNULEE: "red",
};

/** Tant que la commande n'est pas confirmée, c'est une demande de prix (DP-), ensuite un bon de commande (BC-). */
export function isConfirmedOrder(status: PurchaseOrderStatus) {
  return status === "CONFIRMEE" || status === "RECUE";
}

export function purchaseOrderDisplayNumber(number: string, status: PurchaseOrderStatus) {
  return `${isConfirmedOrder(status) ? "BC" : "DP"}-${number}`;
}

/** Suffixe d'un fournisseur dans une mise en concurrence : A, B, C... */
export function competitorSuffix(index: number) {
  return String.fromCharCode(65 + index);
}

export function formatCartons(quantity: number, unitsPerCarton: number | null) {
  if (!unitsPerCarton || unitsPerCarton <= 1) return null;
  const cartons = Math.floor(quantity / unitsPerCarton);
  const rest = quantity % unitsPerCarton;
  if (cartons === 0) return null;
  return `${cartons} carton${cartons > 1 ? "s" : ""} (×${unitsPerCarton})${rest ? ` + ${rest}` : ""}`;
}
