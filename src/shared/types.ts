export type CameraProtocol = 'udp' | 'tcp';

export interface CameraPreset {
  id: string;
  label: string;
  cameraPreset: number;
}

export interface CameraConfig {
  ipAddress: string;
  port: number;
  protocol: CameraProtocol;
  mockMode: boolean;
  presets: CameraPreset[];
}

export interface CameraConnectionStatus {
  connected: boolean;
  mockMode: boolean;
  protocol: CameraProtocol;
  message: string;
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

export interface PanevoApi {
  getConfig: () => Promise<PanevoResult<CameraConfig>>;
  saveConfig: (config: CameraConfig) => Promise<PanevoResult<CameraConfig>>;
  testConnection: () => Promise<PanevoResult<CameraConnectionStatus>>;
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
  recallPreset: (presetNumber: number) => Promise<PanevoResult<CommandResponse>>;
  storePreset: (presetNumber: number) => Promise<PanevoResult<CommandResponse>>;
}
