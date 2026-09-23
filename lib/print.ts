"use client";

/**
 * "58mm"/"80mm"/"A4" correspondent à ReceiptWidth (components/sales/Receipt.tsx)
 * — dupliqué ici pour ne pas dépendre d'un composant depuis ce module
 * partagé. `{ widthMm, heightMm }` couvre les formats d'étiquettes
 * personnalisés (voir lib/label-formats.ts), de dimensions trop variées pour
 * un préréglage fixe.
 */
export type PrintPageSize = "58mm" | "80mm" | "A4" | { widthMm: number; heightMm: number };

declare global {
  interface Window {
    /** Injecté par electron/preload.ts — absent sur le web, où window.print() reste la seule option. */
    zindoDesktop?: { print: (pageSize?: PrintPageSize) => Promise<void> };
  }
}

/**
 * Imprime le document actuellement affiché. Dans l'application Windows,
 * passe par le process principal pour une impression silencieuse (sans
 * boîte de dialogue à valider à chaque ticket — voir electron/main.ts).
 * `pageSize` est nécessaire côté desktop : l'impression silencieuse
 * d'Electron ignore la taille @page déclarée en CSS (contrairement à
 * window.print(), qui passe par l'aperçu et la respecte) et imprimerait
 * sinon sur le format par défaut de l'imprimante — trop large pour un
 * ticket 58/80mm, d'où un contenu tronqué des deux côtés à l'impression.
 * Sur le web, se rabat sur window.print() classique, qui respecte déjà le
 * CSS @page du document (voir Receipt.tsx) sans avoir besoin de cette info.
 */
export function printDocument(pageSize?: PrintPageSize) {
  if (typeof window !== "undefined" && window.zindoDesktop) {
    void window.zindoDesktop.print(pageSize);
  } else {
    window.print();
  }
}
