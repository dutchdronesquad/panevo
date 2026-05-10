export type CameraProtocol = 'udp' | 'tcp';
export type FocusMode = 'auto' | 'manual';
export type CameraHealthCheckMode = 'visca-inquiry' | 'transport-only';

export interface CameraPreset {
  id: string;
  label: string;
  cameraPreset: number;
}

export interface CameraProfile {
  id: string;
  label: string;
  ipAddress: string;
  port: number;
  protocol: CameraProtocol;
  healthCheckMode: CameraHealthCheckMode;
  presets: CameraPreset[];
}

export interface CameraConfig {
  activeCameraId: string;
  cameras: CameraProfile[];
}

export interface CameraConnectionStatus {
  connected: boolean;
  protocol: CameraProtocol;
  message: string;
  checkedAt?: string;
  responseVerified?: boolean;
}

export interface PanevoError {
  code: string;
  message: string;
}

export type PanevoResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: PanevoError };

export interface CommandResponse {
  command: string;
  queuedAt: string;
}

export interface ConfigFileResponse {
  path: string;
}

export interface PanevoApi {
  getConfig: () => Promise<PanevoResult<CameraConfig>>;
  saveConfig: (config: CameraConfig) => Promise<PanevoResult<CameraConfig>>;
  importConfig: () => Promise<PanevoResult<CameraConfig>>;
  exportConfig: () => Promise<PanevoResult<ConfigFileResponse>>;
  testConnection: () => Promise<PanevoResult<CameraConnectionStatus>>;
  testCameraConfig: (camera: CameraProfile) => Promise<PanevoResult<CameraConnectionStatus>>;
  checkCameraHealth: () => Promise<PanevoResult<CameraConnectionStatus>>;
  panLeft: (speed: number) => Promise<PanevoResult<CommandResponse>>;
  panRight: (speed: number) => Promise<PanevoResult<CommandResponse>>;
  tiltUp: (speed: number) => Promise<PanevoResult<CommandResponse>>;
  tiltDown: (speed: number) => Promise<PanevoResult<CommandResponse>>;
  moveUpLeft: (panSpeed: number, tiltSpeed: number) => Promise<PanevoResult<CommandResponse>>;
  moveUpRight: (panSpeed: number, tiltSpeed: number) => Promise<PanevoResult<CommandResponse>>;
  moveDownLeft: (panSpeed: number, tiltSpeed: number) => Promise<PanevoResult<CommandResponse>>;
  moveDownRight: (panSpeed: number, tiltSpeed: number) => Promise<PanevoResult<CommandResponse>>;
  zoomIn: (speed: number) => Promise<PanevoResult<CommandResponse>>;
  zoomOut: (speed: number) => Promise<PanevoResult<CommandResponse>>;
  stop: () => Promise<PanevoResult<CommandResponse>>;
  zoomStop: () => Promise<PanevoResult<CommandResponse>>;
  setFocusMode: (mode: FocusMode) => Promise<PanevoResult<CommandResponse>>;
  focusIn: (speed: number) => Promise<PanevoResult<CommandResponse>>;
  focusOut: (speed: number) => Promise<PanevoResult<CommandResponse>>;
  focusStop: () => Promise<PanevoResult<CommandResponse>>;
  recallPreset: (presetNumber: number) => Promise<PanevoResult<CommandResponse>>;
  storePreset: (presetNumber: number) => Promise<PanevoResult<CommandResponse>>;
}
