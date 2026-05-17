import { contextBridge, ipcRenderer } from "electron";
import type {
  CameraConfig,
  CameraProfile,
  FocusMode,
  IntegrationConfig,
  ObsConnectionInput,
  OnvifDiscoveryInput,
  OnvifProbeInput,
  PanevoAction,
  PanevoApi,
  PanevoPreferences,
  RotorHazardConnectionInput,
} from "./shared/types";

const panevo: PanevoApi = {
  getConfig: () => ipcRenderer.invoke("panevo:get-config"),
  saveConfig: (config: CameraConfig) =>
    ipcRenderer.invoke("panevo:save-config", config),
  getPreferences: () => ipcRenderer.invoke("panevo:get-preferences"),
  savePreferences: (preferences: PanevoPreferences) =>
    ipcRenderer.invoke("panevo:save-preferences", preferences),
  getShortcutRegistrationStatus: () =>
    ipcRenderer.invoke("panevo:get-shortcut-registration-status"),
  getIntegrationConfig: () =>
    ipcRenderer.invoke("panevo:get-integration-config"),
  saveIntegrationConfig: (config: IntegrationConfig) =>
    ipcRenderer.invoke("panevo:save-integration-config", config),
  dispatchAction: (action: PanevoAction) =>
    ipcRenderer.invoke("panevo:dispatch-action", action),
  getPanevoFeedbackState: () => ipcRenderer.invoke("panevo:get-feedback-state"),
  testObsConnection: (input: ObsConnectionInput) =>
    ipcRenderer.invoke("panevo:test-obs-connection", input),
  getObsSceneList: (input: ObsConnectionInput) =>
    ipcRenderer.invoke("panevo:get-obs-scene-list", input),
  testRotorHazardConnection: (input: RotorHazardConnectionInput) =>
    ipcRenderer.invoke("panevo:test-rotorhazard-connection", input),
  importConfig: () => ipcRenderer.invoke("panevo:import-config"),
  exportConfig: () => ipcRenderer.invoke("panevo:export-config"),
  testConnection: () => ipcRenderer.invoke("panevo:test-connection"),
  testCameraConfig: (camera: CameraProfile) =>
    ipcRenderer.invoke("panevo:test-camera-config", camera),
  checkCameraHealth: () => ipcRenderer.invoke("panevo:check-camera-health"),
  probeOnvifCamera: (input: OnvifProbeInput) =>
    ipcRenderer.invoke("panevo:probe-onvif-camera", input),
  discoverOnvifCameras: (input?: OnvifDiscoveryInput) =>
    ipcRenderer.invoke("panevo:discover-onvif-cameras", input),
  panLeft: (speed: number) => ipcRenderer.invoke("panevo:pan-left", speed),
  panRight: (speed: number) => ipcRenderer.invoke("panevo:pan-right", speed),
  tiltUp: (speed: number) => ipcRenderer.invoke("panevo:tilt-up", speed),
  tiltDown: (speed: number) => ipcRenderer.invoke("panevo:tilt-down", speed),
  moveUpLeft: (panSpeed: number, tiltSpeed: number) =>
    ipcRenderer.invoke("panevo:move-up-left", panSpeed, tiltSpeed),
  moveUpRight: (panSpeed: number, tiltSpeed: number) =>
    ipcRenderer.invoke("panevo:move-up-right", panSpeed, tiltSpeed),
  moveDownLeft: (panSpeed: number, tiltSpeed: number) =>
    ipcRenderer.invoke("panevo:move-down-left", panSpeed, tiltSpeed),
  moveDownRight: (panSpeed: number, tiltSpeed: number) =>
    ipcRenderer.invoke("panevo:move-down-right", panSpeed, tiltSpeed),
  zoomIn: (speed: number) => ipcRenderer.invoke("panevo:zoom-in", speed),
  zoomOut: (speed: number) => ipcRenderer.invoke("panevo:zoom-out", speed),
  stop: () => ipcRenderer.invoke("panevo:stop"),
  zoomStop: () => ipcRenderer.invoke("panevo:zoom-stop"),
  setFocusMode: (mode: FocusMode) =>
    ipcRenderer.invoke("panevo:set-focus-mode", mode),
  focusIn: (speed: number) => ipcRenderer.invoke("panevo:focus-in", speed),
  focusOut: (speed: number) => ipcRenderer.invoke("panevo:focus-out", speed),
  focusStop: () => ipcRenderer.invoke("panevo:focus-stop"),
  recallPreset: (presetNumber: number) =>
    ipcRenderer.invoke("panevo:recall-preset", presetNumber),
  storePreset: (presetNumber: number, presetLabel?: string) =>
    ipcRenderer.invoke("panevo:store-preset", presetNumber, presetLabel),
  removePreset: (presetNumber: number) =>
    ipcRenderer.invoke("panevo:remove-preset", presetNumber),
};

contextBridge.exposeInMainWorld("panevo", panevo);
