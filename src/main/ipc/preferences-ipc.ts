import { ipcMain } from "electron";
import type {
  PanevoPreferences,
  PanevoResult,
  ShortcutRegistrationStatus,
} from "@/shared/types";
import { getPreferencesService } from "../services/preferences/preferences-service-instance";
import { getGlobalShortcutService } from "../services/shortcuts/global-shortcut-service";

export const registerPreferencesIpc = (): void => {
  const preferencesService = getPreferencesService();

  ipcMain.handle(
    "panevo:get-preferences",
    async (): Promise<PanevoResult<PanevoPreferences>> => {
      return preferencesService.getPreferences();
    },
  );

  ipcMain.handle(
    "panevo:save-preferences",
    async (
      _event,
      preferences: PanevoPreferences,
    ): Promise<PanevoResult<PanevoPreferences>> => {
      const result = await preferencesService.savePreferences(preferences);
      if (result.ok) {
        await getGlobalShortcutService().refresh();
      }

      return result;
    },
  );

  ipcMain.handle(
    "panevo:get-shortcut-registration-status",
    (): PanevoResult<ShortcutRegistrationStatus> => ({
      ok: true,
      data: { failedIds: getGlobalShortcutService().getFailedRegistrations() },
    }),
  );
};
