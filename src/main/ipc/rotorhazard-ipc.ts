import { ipcMain } from "electron";
import type {
  PanevoResult,
  PanevoRaceState,
  RotorHazardConnectionInput,
  RotorHazardConnectionStatus,
  RotorHazardMonitorState,
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

  ipcMain.handle(
    "panevo:get-rotorhazard-race-state",
    async (
      _event,
      input: RotorHazardConnectionInput,
    ): Promise<PanevoResult<PanevoRaceState>> => {
      return rotorHazardService.getRaceState(input);
    },
  );

  ipcMain.handle(
    "panevo:start-rotorhazard-race-monitor",
    async (
      _event,
      input: RotorHazardConnectionInput,
    ): Promise<PanevoResult<RotorHazardMonitorState>> => {
      return rotorHazardService.startRaceStateMonitor(input);
    },
  );

  ipcMain.handle(
    "panevo:stop-rotorhazard-race-monitor",
    async (): Promise<PanevoResult<RotorHazardMonitorState>> => {
      return rotorHazardService.stopRaceStateMonitor();
    },
  );

  ipcMain.handle(
    "panevo:get-rotorhazard-monitor-state",
    async (): Promise<PanevoResult<RotorHazardMonitorState>> => {
      return rotorHazardService.getMonitorState();
    },
  );
};
