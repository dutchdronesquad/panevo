import { ipcMain } from "electron";
import type {
  PanevoResult,
  RotorHazardConnectionInput,
  RotorHazardConnectionStatus,
} from "@/shared/types";
import { RotorHazardService } from "../services/rotorhazard/rotorhazard-service";

export const registerRotorHazardIpc = (): void => {
  const rotorHazardService = new RotorHazardService();

  ipcMain.handle(
    "panevo:test-rotorhazard-connection",
    async (
      _event,
      input: RotorHazardConnectionInput,
    ): Promise<PanevoResult<RotorHazardConnectionStatus>> => {
      return rotorHazardService.testConnection(input);
    },
  );
};
