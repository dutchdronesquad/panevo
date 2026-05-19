import { ipcMain } from "electron";
import type {
  AutomationConfig,
  AutomationState,
  PanevoResult,
} from "@/shared/types";
import {
  ensureAutomationRulesLoaded,
  getAutomationService,
  saveAutomationConfig,
} from "../services/automation/automation-service-instance";

const success = <T>(data: T): PanevoResult<T> => ({ ok: true, data });

export const registerAutomationIpc = (): void => {
  ipcMain.handle(
    "panevo:get-automation-state",
    async (): Promise<PanevoResult<AutomationState>> => {
      const configResult = await ensureAutomationRulesLoaded();
      if (!configResult.ok) {
        return configResult;
      }

      return success(getAutomationService().getState());
    },
  );

  ipcMain.handle(
    "panevo:set-automation-enabled",
    async (
      _event,
      enabled: boolean,
    ): Promise<PanevoResult<AutomationState>> => {
      const configResult = await ensureAutomationRulesLoaded();
      if (!configResult.ok) {
        return configResult;
      }

      return success(getAutomationService().setEnabled(enabled));
    },
  );

  ipcMain.handle(
    "panevo:get-automation-config",
    async (): Promise<PanevoResult<AutomationConfig>> => {
      return ensureAutomationRulesLoaded();
    },
  );

  ipcMain.handle(
    "panevo:save-automation-config",
    async (
      _event,
      config: AutomationConfig,
    ): Promise<PanevoResult<AutomationConfig>> => {
      return saveAutomationConfig(config);
    },
  );
};
