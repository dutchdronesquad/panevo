import { contextBridge, ipcRenderer } from 'electron';
import type { CameraConfig, PanevoApi } from './shared/types';

const panevo: PanevoApi = {
  getConfig: () => ipcRenderer.invoke('panevo:get-config'),
  saveConfig: (config: CameraConfig) => ipcRenderer.invoke('panevo:save-config', config),
  testConnection: () => ipcRenderer.invoke('panevo:test-connection'),
  panLeft: (speed: number) => ipcRenderer.invoke('panevo:pan-left', speed),
  panRight: (speed: number) => ipcRenderer.invoke('panevo:pan-right', speed),
  tiltUp: (speed: number) => ipcRenderer.invoke('panevo:tilt-up', speed),
  tiltDown: (speed: number) => ipcRenderer.invoke('panevo:tilt-down', speed),
  moveUpLeft: (panSpeed: number, tiltSpeed: number) => ipcRenderer.invoke('panevo:move-up-left', panSpeed, tiltSpeed),
  moveUpRight: (panSpeed: number, tiltSpeed: number) => ipcRenderer.invoke('panevo:move-up-right', panSpeed, tiltSpeed),
  moveDownLeft: (panSpeed: number, tiltSpeed: number) =>
    ipcRenderer.invoke('panevo:move-down-left', panSpeed, tiltSpeed),
  moveDownRight: (panSpeed: number, tiltSpeed: number) =>
    ipcRenderer.invoke('panevo:move-down-right', panSpeed, tiltSpeed),
  zoomIn: (speed: number) => ipcRenderer.invoke('panevo:zoom-in', speed),
  zoomOut: (speed: number) => ipcRenderer.invoke('panevo:zoom-out', speed),
  stop: () => ipcRenderer.invoke('panevo:stop'),
  zoomStop: () => ipcRenderer.invoke('panevo:zoom-stop'),
  recallPreset: (presetNumber: number) => ipcRenderer.invoke('panevo:recall-preset', presetNumber),
  storePreset: (presetNumber: number) => ipcRenderer.invoke('panevo:store-preset', presetNumber),
};

contextBridge.exposeInMainWorld('panevo', panevo);
