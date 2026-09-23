import { app, BrowserWindow, Menu, ipcMain, dialog } from "electron";
import { fork, type ChildProcess } from "node:child_process";
import path from "node:path";
import http from "node:http";
import { appendFileSync, createWriteStream } from "node:fs";
import { findFreePort } from "./find-port";
import { DESKTOP_ENV } from "./env.generated";

let mainWindow: BrowserWindow | null = null;
let serverProcess: ChildProcess | null = null;

/** Journal minimal des erreurs fatales du process principal — utile pour diagnostiquer un problème signalé par un commerçant. */
function logFatal(msg: string) {
  try {
    appendFileSync(path.join(app.getPath("userData"), "crash.log"), `${new Date().toISOString()} ${msg}\n`);
  } catch {
    // best-effort
  }
}
process.on("uncaughtException", (e) => logFatal(`UNCAUGHT: ${e?.stack || e}`));
process.on("unhandledRejection", (e) => logFatal(`UNHANDLED REJECTION: ${e instanceof Error ? e.stack : e}`));

// En développement (npm run electron:dev), le serveur Next.js standalone
// n'existe pas encore construit : on pointe alors vers `next dev` déjà lancé
// à part sur ce port, et on saute le fork ci-dessous.
const isDev = !app.isPackaged && process.env.ELECTRON_DEV_SERVER_URL;

function standaloneServerPath(): string {
  // Empaqueté : electron-builder place .next/standalone sous
  // resources/standalone (voir electron-builder.yml, extraResources).
  // Non empaqueté (électron:pack en local avant installation) : chemin relatif au repo.
  const base = app.isPackaged ? process.resourcesPath : path.join(__dirname, "..");
  return path.join(base, app.isPackaged ? "standalone" : ".next/standalone", "server.js");
}

// 45s (et non 15s) : au tout premier lancement après installation, l'antivirus
// scanne encore chaque fichier du bundle standalone au fur et à mesure que
// Node les require — sur certaines machines ça peut largement dépasser 15s
// et faisait échouer le démarrage à tort (voir electron/main.ts createWindow).
function waitForServer(port: number, timeoutMs = 45000): Promise<void> {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tryOnce = () => {
      const req = http.get({ host: "127.0.0.1", port, path: "/", timeout: 2000 }, (res) => {
        res.resume();
        resolve();
      });
      req.on("error", () => {
        if (Date.now() - start > timeoutMs) {
          reject(new Error("Le serveur ZINDO local n'a pas démarré à temps."));
          return;
        }
        setTimeout(tryOnce, 300);
      });
    };
    tryOnce();
  });
}

async function startLocalServer(): Promise<string> {
  const port = await findFreePort();
  const serverPath = standaloneServerPath();

  // `stdio: "inherit"` n'a nulle part où écrire quand l'app est lancée par
  // double-clic (pas de console attachée) : les erreurs serveur (rendu React
  // plantant côté serveur, etc.) étaient donc perdues, impossibles à
  // diagnostiquer à distance. On les redirige plutôt vers un fichier dans
  // userData, relu au besoin comme crash.log.
  const serverLogStream = createWriteStream(path.join(app.getPath("userData"), "server.log"), { flags: "a" });

  serverProcess = fork(serverPath, [], {
    env: {
      ...process.env,
      ...DESKTOP_ENV,
      PORT: String(port),
      HOSTNAME: "127.0.0.1",
      NODE_ENV: "production",
      ZINDO_DESKTOP_BUILD: "1",
      ZINDO_LOCAL_CACHE_DIR: app.getPath("userData"),
      // fork() réutilise l'exécutable Electron comme interprète Node pour le
      // serveur enfant — cette variable lui fait exécuter server.js comme un
      // script Node normal plutôt que de rebooter le framework Electron.
      ELECTRON_RUN_AS_NODE: "1",
    },
    stdio: ["ignore", "pipe", "pipe", "ipc"],
  });

  const logLine = (prefix: string) => (chunk: Buffer) =>
    serverLogStream.write(`${new Date().toISOString()} [${prefix}] ${chunk.toString()}`);
  serverProcess.stdout?.on("data", logLine("out"));
  serverProcess.stderr?.on("data", logLine("err"));

  serverProcess.on("exit", (code) => {
    if (code !== 0 && code !== null) {
      logFatal(`Le serveur ZINDO local s'est arrêté (code ${code})`);
    }
  });

  await waitForServer(port);
  return `http://127.0.0.1:${port}`;
}

// L'impression silencieuse d'Electron (contrairement à window.print(), qui
// passe par l'aperçu et respecte le CSS @page du document) ignore la taille
// @page déclarée par la page et utilise sinon le format par défaut de
// l'imprimante — beaucoup trop large pour un ticket 58/80mm, ce qui tronque
// le contenu des deux côtés à l'impression. On la fixe donc explicitement ;
// hauteur volontairement très généreuse (rouleau continu), l'imprimante
// thermique coupe de toute façon après la fin réelle du contenu.
const FIXED_PAGE_SIZES: Record<"58mm" | "80mm" | "A4", Electron.WebContentsPrintOptions["pageSize"]> = {
  "58mm": { width: 58000, height: 3000000 },
  "80mm": { width: 80000, height: 3000000 },
  A4: "A4",
};
type PrintPageSize = "58mm" | "80mm" | "A4" | { widthMm: number; heightMm: number };

function resolvePageSize(pageSize?: PrintPageSize): Electron.WebContentsPrintOptions["pageSize"] | undefined {
  if (!pageSize) return undefined;
  if (typeof pageSize === "string") return FIXED_PAGE_SIZES[pageSize];
  // Un millimètre = 1000 microns (unité attendue par Electron ici).
  return { width: Math.round(pageSize.widthMm * 1000), height: Math.round(pageSize.heightMm * 1000) };
}

/**
 * Impression sans boîte de dialogue — la caissière ne doit jamais avoir à
 * valider une fenêtre "Imprimer" à chaque ticket. Imprime sur l'imprimante
 * Windows par défaut ; si aucune n'est définie, Electron choisit la première
 * disponible plutôt que d'échouer silencieusement.
 */
function printSilently(pageSize?: PrintPageSize) {
  return new Promise<void>((resolve) => {
    if (!mainWindow) return resolve();
    const resolved = resolvePageSize(pageSize);
    mainWindow.webContents.print(
      { silent: true, ...(resolved ? { pageSize: resolved } : {}) },
      (success, reason) => {
        if (!success) logFatal(`Impression silencieuse échouée : ${reason}`);
        resolve();
      }
    );
  });
}
ipcMain.handle("zindo-print", (_event, pageSize?: PrintPageSize) => printSilently(pageSize));

async function createWindow() {
  const url = isDev ? process.env.ELECTRON_DEV_SERVER_URL! : await startLocalServer();

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "ZINDO",
    icon: app.isPackaged
      ? path.join(process.resourcesPath, "icon.png")
      : path.join(__dirname, "..", "public", "icons", "icon-512.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Menu explicite avec un raccourci d'impression fiable (webContents.print,
  // appelé depuis le process principal) — indépendant de window.print() côté
  // page, pour écarter tout souci propre au menu par défaut d'Electron.
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      {
        label: "Fichier",
        submenu: [
          { label: "Imprimer", accelerator: "CmdOrCtrl+P", click: () => printSilently() },
        ],
      },
      {
        label: "Affichage",
        submenu: [
          { label: "Recharger", accelerator: "CmdOrCtrl+R", click: () => mainWindow?.reload() },
          { label: "Outils de développement", accelerator: "F12", click: () => mainWindow?.webContents.toggleDevTools() },
        ],
      },
    ])
  );

  await mainWindow.loadURL(url);

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function stopLocalServer() {
  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill();
    serverProcess = null;
  }
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  // En cas d'échec (ex. serveur local trop lent à démarrer), on affichait
  // seulement l'erreur dans crash.log : le commerçant cliquait sur l'icône et
  // ne voyait strictement rien se passer, sans aucun indice du problème.
  // On affiche désormais une boîte de dialogue explicite, et on quitte
  // proprement au lieu de laisser un process zombie sans fenêtre tourner en
  // arrière-plan (ce zombie bloquait ensuite tout nouveau clic via le verrou
  // mono-instance ci-dessous, sans qu'aucune fenêtre ne s'ouvre jamais).
  app.whenReady().then(createWindow).catch((e) => {
    logFatal(`createWindow: ${e?.stack || e}`);
    dialog.showErrorBox(
      "ZINDO n'a pas pu démarrer",
      "Le serveur local de ZINDO n'a pas répondu à temps. Vérifiez qu'aucun antivirus ne bloque l'application, puis réessayez. Si le problème persiste, contactez le support ZINDO."
    );
    app.quit();
  });

  app.on("window-all-closed", () => {
    stopLocalServer();
    if (process.platform !== "darwin") app.quit();
  });

  app.on("before-quit", stopLocalServer);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
}
