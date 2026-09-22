import { app, BrowserWindow } from "electron";
import { fork, type ChildProcess } from "node:child_process";
import path from "node:path";
import http from "node:http";
import { findFreePort } from "./find-port";
import { DESKTOP_ENV } from "./env.generated";

let mainWindow: BrowserWindow | null = null;
let serverProcess: ChildProcess | null = null;

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

function waitForServer(port: number, timeoutMs = 15000): Promise<void> {
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

  serverProcess = fork(serverPath, [], {
    env: {
      ...process.env,
      ...DESKTOP_ENV,
      PORT: String(port),
      HOSTNAME: "127.0.0.1",
      NODE_ENV: "production",
      ZINDO_DESKTOP_BUILD: "1",
      ZINDO_LOCAL_CACHE_DIR: app.getPath("userData"),
    },
    stdio: "inherit",
    // Le serveur standalone est un script CommonJS classique ; fork() se
    // charge de lancer un nouveau process Node en lui parlant en IPC.
    silent: false,
  });

  serverProcess.on("exit", (code) => {
    if (code !== 0 && code !== null) {
      console.error(`[electron] Le serveur ZINDO local s'est arrêté (code ${code})`);
    }
  });

  await waitForServer(port);
  return `http://127.0.0.1:${port}`;
}

async function createWindow() {
  const url = isDev ? process.env.ELECTRON_DEV_SERVER_URL! : await startLocalServer();

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "ZINDO",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

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

  app.whenReady().then(createWindow);

  app.on("window-all-closed", () => {
    stopLocalServer();
    if (process.platform !== "darwin") app.quit();
  });

  app.on("before-quit", stopLocalServer);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
}
