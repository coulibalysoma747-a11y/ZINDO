import { contextBridge, ipcRenderer } from "electron";

type PrintPageSize = "58mm" | "80mm" | "A4" | { widthMm: number; heightMm: number };

// Expose une impression silencieuse (sans boîte de dialogue) au renderer —
// nécessaire pour la caisse : la vendeuse ne doit jamais avoir à valider une
// fenêtre "Imprimer" à chaque ticket. Voir electron/main.ts (ipcMain.handle)
// et lib/print.ts côté application (repli sur window.print() hors desktop).
contextBridge.exposeInMainWorld("zindoDesktop", {
  print: (pageSize?: PrintPageSize) => ipcRenderer.invoke("zindo-print", pageSize),
});
