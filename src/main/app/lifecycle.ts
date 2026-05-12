import { app, BrowserWindow } from "electron";
import { createMainWindow, getMainWindow } from "./main-window";
import { platformConfig } from "./platform";
import { createTray } from "./tray";

let isQuitting = false;

const markQuitting = () => {
  isQuitting = true;
};

export const configureAppIdentity = () => {
  app.setName("Panevo");

  if (platformConfig.appUserModelId) {
    app.setAppUserModelId(platformConfig.appUserModelId);
  }
};

export const createAppShell = () => {
  const mainWindow = createMainWindow();
  createTray(showAppShell, markQuitting);

  mainWindow.on("close", (event) => {
    if (isQuitting || !platformConfig.closeToTray) {
      return;
    }

    event.preventDefault();
    mainWindow.hide();
  });
};

export const showAppShell = () => {
  const mainWindow = getMainWindow();

  if (!mainWindow) {
    createAppShell();
    return;
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }

  mainWindow.show();
  mainWindow.focus();
};

export const registerAppLifecycle = () => {
  app.on("window-all-closed", () => {
    if (platformConfig.closeToTray && isQuitting) {
      app.quit();
    }
  });

  app.on("before-quit", markQuitting);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createAppShell();
    }
  });
};
