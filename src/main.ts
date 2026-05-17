import { app } from "electron";
import started from "electron-squirrel-startup";
import {
  configureAppIdentity,
  createAppShell,
  registerAppLifecycle,
} from "./main/app/lifecycle";
import { registerActionIpc } from "./main/ipc/action-ipc";
import { registerCameraIpc } from "./main/ipc/camera-ipc";
import { registerIntegrationIpc } from "./main/ipc/integration-ipc";
import { registerObsIpc } from "./main/ipc/obs-ipc";
import { registerOnvifIpc } from "./main/ipc/onvif-ipc";
import { registerPreferencesIpc } from "./main/ipc/preferences-ipc";
import { registerRotorHazardIpc } from "./main/ipc/rotorhazard-ipc";
import { getGlobalShortcutService } from "./main/services/shortcuts/global-shortcut-service";

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

configureAppIdentity();
registerAppLifecycle();

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  registerActionIpc();
  registerCameraIpc();
  registerIntegrationIpc();
  registerObsIpc();
  registerOnvifIpc();
  registerPreferencesIpc();
  registerRotorHazardIpc();
  void getGlobalShortcutService().start();
  createAppShell();
});

app.on("will-quit", () => {
  getGlobalShortcutService().dispose();
});
