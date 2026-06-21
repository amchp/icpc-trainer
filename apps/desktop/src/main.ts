import Electron from "electron";
import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

let backendProcess: ChildProcess | undefined;

const APP_NAME = "ICPC Trainer";
const { app, BrowserWindow } = Electron;
const dirname = fileURLToPath(new URL(".", import.meta.url));
const isSmoke = process.env.ICPC_TRAINER_DESKTOP_SMOKE === "1";

const resolvePreloadPath = (): string => join(dirname, "../preload/preload.mjs");

const resolveWebUrl = (): string => {
  if (process.env.ICPC_TRAINER_WEB_URL) {
    return process.env.ICPC_TRAINER_WEB_URL;
  }

  if (process.env.ELECTRON_RENDERER_URL) {
    return process.env.ELECTRON_RENDERER_URL;
  }

  if (!app.isPackaged) {
    return "http://127.0.0.1:5173";
  }

  return new URL("../../web/dist/index.html", import.meta.url).toString();
};

const startBackendIfAvailable = (): void => {
  if (!app.isPackaged || isSmoke) {
    return;
  }

  const serverEntry = join(process.resourcesPath, "server", "main.js");
  if (!existsSync(serverEntry)) {
    return;
  }

  backendProcess = spawn(process.execPath, [serverEntry], {
    stdio: "ignore",
    env: {
      ...process.env,
      ICPC_TRAINER_HOST: process.env.ICPC_TRAINER_HOST ?? "127.0.0.1",
      ICPC_TRAINER_PORT: process.env.ICPC_TRAINER_PORT ?? "3773"
    }
  });
};

const createWindow = async (): Promise<void> => {
  const window = new BrowserWindow({
    title: APP_NAME,
    width: 1180,
    height: 760,
    show: !isSmoke,
    backgroundColor: "#09090b",
    webPreferences: {
      preload: resolvePreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  if (isSmoke) {
    window.webContents.once("did-finish-load", () => {
      app.quit();
    });
  }

  await window.loadURL(resolveWebUrl());
};

app.whenReady().then(async () => {
  startBackendIfAvailable();
  await createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  backendProcess?.kill();
});
