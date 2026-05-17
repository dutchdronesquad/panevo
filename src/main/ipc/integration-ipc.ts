import { ipcMain } from "electron";
import type { IntegrationConfig, PanevoResult } from "@/shared/types";
import { IntegrationConfigService } from "../services/integrations/integration-config-service";

export const registerIntegrationIpc = (): void => {
  const integrationConfigService = new IntegrationConfigService();

  ipcMain.handle(
    "panevo:get-integration-config",
    async (): Promise<PanevoResult<IntegrationConfig>> => {
      return integrationConfigService.getConfig();
    },
  );

  ipcMain.handle(
    "panevo:save-integration-config",
    async (
      _event,
      config: IntegrationConfig,
    ): Promise<PanevoResult<IntegrationConfig>> => {
      return integrationConfigService.saveConfig(config);
    },
  );
};
