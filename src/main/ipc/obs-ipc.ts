import { ipcMain } from "electron";
import type {
  ObsConnectionInput,
  ObsConnectionStatus,
  ObsSceneListResult,
  PanevoResult,
} from "@/shared/types";
import { ObsService } from "../services/obs/obs-service";

export const registerObsIpc = (): void => {
  const obsService = new ObsService();

  ipcMain.handle(
    "panevo:test-obs-connection",
    async (
      _event,
      input: ObsConnectionInput,
    ): Promise<PanevoResult<ObsConnectionStatus>> => {
      return obsService.testConnection(input);
    },
  );

  ipcMain.handle(
    "panevo:get-obs-scene-list",
    async (
      _event,
      input: ObsConnectionInput,
    ): Promise<PanevoResult<ObsSceneListResult>> => {
      return obsService.getSceneList(input);
    },
  );
};
