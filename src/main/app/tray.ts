import { app, Menu, nativeImage, Tray } from "electron";
import { platformConfig } from "./platform";

let tray: Tray | null = null;

export const createTray = (onShow: () => void, onQuit: () => void) => {
  if (tray || !platformConfig.enableTray) {
    return;
  }

  const trayIcon = nativeImage
    .createFromPath(platformConfig.trayIconPath)
    .resize({
      width: platformConfig.trayIconSize,
      height: platformConfig.trayIconSize,
    });

  tray = new Tray(trayIcon);
  tray.setToolTip("Panevo");
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: "Open Panevo",
        click: onShow,
      },
      { type: "separator" },
      {
        label: "Quit Panevo",
        click: () => {
          onQuit();
          app.quit();
        },
      },
    ]),
  );
  tray.on("click", onShow);
};
