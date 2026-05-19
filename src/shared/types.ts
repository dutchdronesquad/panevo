export type CameraProtocol = "udp" | "tcp";
export type CameraControlProtocol = "visca" | "onvif";
export type CameraSyncProtocol = "none" | "onvif";
export type FocusMode = "auto" | "manual";
export type CameraHealthCheckMode = "visca-inquiry" | "transport-only";

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
  onvifPort: number;
  onvifUsername: string;
  onvifPassword: string;
  controlProtocol: CameraControlProtocol;
  syncProtocol: CameraSyncProtocol;
  protocol: CameraProtocol;
  healthCheckMode: CameraHealthCheckMode;
  presets: CameraPreset[];
}

export interface CameraConfig {
  activeCameraId: string;
  cameras: CameraProfile[];
}

export type IntegrationLifecycleState =
  | "not-configured"
  | "configured"
  | "enabled"
  | "connected"
  | "error"
  | "disabled";

export interface IntegrationConfigEntry {
  id: string;
  integrationId: string;
  lifecycleState: IntegrationLifecycleState;
  settings: Record<string, unknown>;
  lastError?: string;
  updatedAt: string;
}

export interface IntegrationConfig {
  integrations: IntegrationConfigEntry[];
}

export interface ObsConnectionInput {
  host: string;
  port: number;
  password?: string;
  secure?: boolean;
  timeoutMs?: number;
}

export interface ObsConnectionStatus {
  connected: boolean;
  host: string;
  port: number;
  secure: boolean;
  message: string;
  checkedAt: string;
  obsStudioVersion?: string;
  obsWebSocketVersion?: string;
  negotiatedRpcVersion?: number;
}

export interface ObsSceneInfo {
  name: string;
  uuid?: string;
}

export interface ObsSceneListResult extends ObsConnectionStatus {
  currentProgramSceneName?: string;
  currentPreviewSceneName?: string;
  scenes: ObsSceneInfo[];
}

export interface RotorHazardConnectionInput {
  host: string;
  port?: number;
  timeoutMs?: number;
}

export interface RotorHazardConnectionStatus {
  connected: boolean;
  baseUrl: string;
  transport: "socket.io";
  message: string;
  checkedAt: string;
  socketId?: string;
}

export type RotorHazardMonitorStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "stale"
  | "disconnected"
  | "error";

export interface RotorHazardMonitorState {
  status: RotorHazardMonitorStatus;
  connected: boolean;
  stale: boolean;
  automationPaused: boolean;
  message: string;
  updatedAt: string;
  baseUrl?: string;
  socketId?: string;
  raceState?: PanevoRaceState;
  recentEvents: PanevoRaceEvent[];
  error?: string;
}

export type PanevoRaceStatus =
  | "unknown"
  | "ready"
  | "staging"
  | "racing"
  | "finished"
  | "done"
  | "stale";

export interface PanevoRaceHeat {
  id?: string;
  name?: string;
  round?: number;
}

export interface PanevoRacePilot {
  id?: string;
  callsign?: string;
  lane?: number;
  channel?: string;
}

export interface PanevoRaceState {
  source: "rotorhazard";
  status: PanevoRaceStatus;
  activeHeat?: PanevoRaceHeat;
  pilots: PanevoRacePilot[];
  stale: boolean;
  updatedAt: string;
}

export type PanevoRaceEventType =
  | "race.ready"
  | "race.staging"
  | "race.started"
  | "race.finished"
  | "race.done"
  | "race.lap-recorded"
  | "race.active-heat-changed"
  | "race.data-stale";

export interface PanevoRaceEvent {
  id: string;
  type: PanevoRaceEventType;
  source: "rotorhazard";
  occurredAt: string;
  raceState: PanevoRaceState;
  payload?: Record<string, unknown>;
}

export type KeyboardShortcutGroup = "movement" | "zoom" | "presets" | "safety";

export type KeyboardShortcutMode = "hold" | "press";

export type KeyboardShortcutActionId =
  | "ptz.tilt-up"
  | "ptz.tilt-down"
  | "ptz.pan-left"
  | "ptz.pan-right"
  | "ptz.up-left"
  | "ptz.up-right"
  | "ptz.down-left"
  | "ptz.down-right"
  | "zoom.in"
  | "zoom.out"
  | "preset.1"
  | "preset.2"
  | "preset.3"
  | "preset.4"
  | "preset.5"
  | "preset.6"
  | "preset.7"
  | "preset.8"
  | "preset.9"
  | "stop.all";

export interface KeyboardShortcutBinding {
  id: KeyboardShortcutActionId;
  label: string;
  group: KeyboardShortcutGroup;
  mode: KeyboardShortcutMode;
  enabled: boolean;
  keys: string[];
}

export interface KeyboardShortcutConfig {
  enabled: boolean;
  bindings: KeyboardShortcutBinding[];
}

export interface PanevoPreferences {
  keyboardShortcuts: KeyboardShortcutConfig;
}

export type PanevoActionSource =
  | "operator"
  | "integration"
  | "automation"
  | "system";

export type PanevoActionSafety = "safe" | "guarded" | "destructive";

export type PanevoPtzDirection =
  | "pan-left"
  | "pan-right"
  | "tilt-up"
  | "tilt-down"
  | "up-left"
  | "up-right"
  | "down-left"
  | "down-right";

interface PanevoActionBase {
  id?: string;
  source?: PanevoActionSource;
  requestedAt?: string;
}

export interface PanevoSelectCameraAction extends PanevoActionBase {
  type: "camera.select";
  cameraId: string;
}

export interface PanevoPtzMoveAction extends PanevoActionBase {
  type: "camera.ptz.move";
  direction: PanevoPtzDirection;
  speed?: number;
  panSpeed?: number;
  tiltSpeed?: number;
}

export interface PanevoZoomMoveAction extends PanevoActionBase {
  type: "camera.zoom.move";
  direction: "in" | "out";
  speed: number;
}

export interface PanevoStopAction extends PanevoActionBase {
  type: "camera.stop";
  target: "movement" | "zoom" | "focus" | "all";
}

export interface PanevoFocusModeAction extends PanevoActionBase {
  type: "camera.focus.mode";
  mode: FocusMode;
}

export interface PanevoFocusMoveAction extends PanevoActionBase {
  type: "camera.focus.move";
  direction: "in" | "out";
  speed: number;
}

export interface PanevoPresetRecallAction extends PanevoActionBase {
  type: "preset.recall";
  presetNumber: number;
}

export interface PanevoPresetStoreAction extends PanevoActionBase {
  type: "preset.store";
  presetNumber: number;
  presetLabel?: string;
}

export interface PanevoPresetRemoveAction extends PanevoActionBase {
  type: "preset.remove";
  presetNumber: number;
}

export interface PanevoObsSceneAction extends PanevoActionBase {
  type: "obs.scene.switch";
  sceneName: string;
}

export interface PanevoAutomationProfileAction extends PanevoActionBase {
  type: "automation.profile.set-enabled";
  profileId: string;
  enabled: boolean;
}

export type PanevoAction =
  | PanevoSelectCameraAction
  | PanevoPtzMoveAction
  | PanevoZoomMoveAction
  | PanevoStopAction
  | PanevoFocusModeAction
  | PanevoFocusMoveAction
  | PanevoPresetRecallAction
  | PanevoPresetStoreAction
  | PanevoPresetRemoveAction
  | PanevoObsSceneAction
  | PanevoAutomationProfileAction;

export interface PanevoActionDispatchResult {
  actionId: string;
  actionType: PanevoAction["type"];
  source: PanevoActionSource;
  safety: PanevoActionSafety;
  status: "completed";
  requestedAt: string;
  completedAt: string;
  cameraId?: string;
  command?: CommandResponse;
  message: string;
  feedback: PanevoFeedbackState;
}

export type AutomationTrigger =
  | {
      type: "race.event";
      eventType?: PanevoRaceEventType;
    }
  | {
      type: "manual.action";
      actionType?: PanevoAction["type"];
    }
  | {
      type: "obs.state";
      sceneName?: string;
    }
  | {
      type: "control-device.input";
      inputId?: string;
    };

export type AutomationCondition =
  | {
      type: "race.status";
      status: PanevoRaceStatus;
    }
  | {
      type: "race.not-stale";
    };

export interface AutomationAction {
  id?: string;
  type: "panevo.action";
  action: PanevoAction;
}

export interface AutomationRule {
  id: string;
  label: string;
  enabled: boolean;
  trigger: AutomationTrigger;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
}

export interface AutomationConfig {
  rules: AutomationRule[];
}

export type AutomationEvent =
  | {
      type: "race.event";
      event: PanevoRaceEvent;
    }
  | {
      type: "manual.action";
      action: PanevoAction;
    }
  | {
      type: "obs.state";
      sceneName?: string;
    }
  | {
      type: "control-device.input";
      inputId: string;
    };

export interface AutomationActionRunResult {
  actionId: string;
  status: "completed" | "failed";
  result?: PanevoActionDispatchResult;
  error?: PanevoError;
}

export interface AutomationRuleRunResult {
  ruleId: string;
  ruleLabel: string;
  status: "completed" | "failed" | "skipped" | "interrupted";
  message: string;
  actions: AutomationActionRunResult[];
}

export interface AutomationEvaluationResult {
  enabled: boolean;
  matchedRuleCount: number;
  skippedReason?: string;
  runs: AutomationRuleRunResult[];
  evaluatedAt: string;
}

export interface AutomationState {
  enabled: boolean;
  ruleCount: number;
  lastTriggeredRule?: {
    id: string;
    label: string;
    triggeredAt: string;
  };
  lastRunResult?: AutomationRuleRunResult;
  pausedReason?: string;
  updatedAt: string;
}

export interface PanevoCameraFeedback {
  id: string;
  label: string;
  controlProtocol: CameraControlProtocol;
  syncProtocol: CameraSyncProtocol;
}

export interface PanevoConnectionFeedback {
  status: "unknown" | "connected" | "disconnected" | "error";
  message: string;
  controlProtocol?: CameraControlProtocol;
  checkedAt?: string;
}

export interface PanevoLastCommandFeedback {
  actionId: string;
  actionType: PanevoAction["type"];
  status: "completed" | "failed" | "unsupported";
  message: string;
  completedAt: string;
  command?: string;
}

export interface PanevoIntegrationFeedback {
  id: string;
  integrationId: string;
  lifecycleState: IntegrationLifecycleState;
  lastError?: string;
}

export interface PanevoFeedbackState {
  activeCamera: PanevoCameraFeedback | null;
  connection: PanevoConnectionFeedback;
  presets: CameraPreset[];
  integrations: PanevoIntegrationFeedback[];
  lastCommand?: PanevoLastCommandFeedback;
  updatedAt: string;
}

export interface CameraConnectionStatus {
  connected: boolean;
  protocol: CameraProtocol;
  controlProtocol?: CameraControlProtocol;
  message: string;
  checkedAt?: string;
  responseVerified?: boolean;
}

export interface OnvifProbeInput {
  ipAddress: string;
  port?: number;
  username?: string;
  password?: string;
  timeoutMs?: number;
}

export interface OnvifDiscoveryInput {
  timeoutMs?: number;
}

export interface OnvifDeviceInfo {
  manufacturer?: string;
  model?: string;
  firmwareVersion?: string;
  serialNumber?: string;
  hardwareId?: string;
}

export interface OnvifCapabilitySummary {
  device: boolean;
  media: boolean;
  ptz: boolean;
  imaging: boolean;
  events: boolean;
}

export interface OnvifProfileInfo {
  token: string;
  name?: string;
  hasPtz: boolean;
  hasVideoSource: boolean;
  hasVideoEncoder: boolean;
}

export interface OnvifStreamUriInfo {
  profileToken: string;
  profileName?: string;
  uri: string;
}

export interface OnvifPresetInfo {
  token: string;
  name?: string;
  numericPreset?: number;
}

export interface OnvifDiscoveryResult {
  urn?: string;
  ipAddress: string;
  port: number;
  path?: string;
  xaddrs: string[];
}

export interface OnvifProbeResult {
  reachable: boolean;
  ipAddress: string;
  port: number;
  checkedAt: string;
  message: string;
  device?: OnvifDeviceInfo;
  capabilities: OnvifCapabilitySummary;
  profiles: OnvifProfileInfo[];
  streamUris: OnvifStreamUriInfo[];
  presets: OnvifPresetInfo[];
  ptzNodeCount: number;
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

export interface ShortcutRegistrationStatus {
  failedIds: string[];
}

export interface PanevoApi {
  getConfig: () => Promise<PanevoResult<CameraConfig>>;
  saveConfig: (config: CameraConfig) => Promise<PanevoResult<CameraConfig>>;
  getPreferences: () => Promise<PanevoResult<PanevoPreferences>>;
  savePreferences: (
    preferences: PanevoPreferences,
  ) => Promise<PanevoResult<PanevoPreferences>>;
  getShortcutRegistrationStatus: () => Promise<
    PanevoResult<ShortcutRegistrationStatus>
  >;
  getIntegrationConfig: () => Promise<PanevoResult<IntegrationConfig>>;
  saveIntegrationConfig: (
    config: IntegrationConfig,
  ) => Promise<PanevoResult<IntegrationConfig>>;
  dispatchAction: (
    action: PanevoAction,
  ) => Promise<PanevoResult<PanevoActionDispatchResult>>;
  getPanevoFeedbackState: () => Promise<PanevoResult<PanevoFeedbackState>>;
  testObsConnection: (
    input: ObsConnectionInput,
  ) => Promise<PanevoResult<ObsConnectionStatus>>;
  getObsSceneList: (
    input: ObsConnectionInput,
  ) => Promise<PanevoResult<ObsSceneListResult>>;
  testRotorHazardConnection: (
    input: RotorHazardConnectionInput,
  ) => Promise<PanevoResult<RotorHazardConnectionStatus>>;
  getRotorHazardRaceState: (
    input: RotorHazardConnectionInput,
  ) => Promise<PanevoResult<PanevoRaceState>>;
  startRotorHazardRaceMonitor: (
    input: RotorHazardConnectionInput,
  ) => Promise<PanevoResult<RotorHazardMonitorState>>;
  stopRotorHazardRaceMonitor: () => Promise<
    PanevoResult<RotorHazardMonitorState>
  >;
  getRotorHazardMonitorState: () => Promise<
    PanevoResult<RotorHazardMonitorState>
  >;
  getAutomationState: () => Promise<PanevoResult<AutomationState>>;
  setAutomationEnabled: (
    enabled: boolean,
  ) => Promise<PanevoResult<AutomationState>>;
  getAutomationConfig: () => Promise<PanevoResult<AutomationConfig>>;
  saveAutomationConfig: (
    config: AutomationConfig,
  ) => Promise<PanevoResult<AutomationConfig>>;
  importConfig: () => Promise<PanevoResult<CameraConfig>>;
  exportConfig: () => Promise<PanevoResult<ConfigFileResponse>>;
  testConnection: () => Promise<PanevoResult<CameraConnectionStatus>>;
  testCameraConfig: (
    camera: CameraProfile,
  ) => Promise<PanevoResult<CameraConnectionStatus>>;
  checkCameraHealth: () => Promise<PanevoResult<CameraConnectionStatus>>;
  probeOnvifCamera: (
    input: OnvifProbeInput,
  ) => Promise<PanevoResult<OnvifProbeResult>>;
  discoverOnvifCameras: (
    input?: OnvifDiscoveryInput,
  ) => Promise<PanevoResult<OnvifDiscoveryResult[]>>;
  panLeft: (speed: number) => Promise<PanevoResult<CommandResponse>>;
  panRight: (speed: number) => Promise<PanevoResult<CommandResponse>>;
  tiltUp: (speed: number) => Promise<PanevoResult<CommandResponse>>;
  tiltDown: (speed: number) => Promise<PanevoResult<CommandResponse>>;
  moveUpLeft: (
    panSpeed: number,
    tiltSpeed: number,
  ) => Promise<PanevoResult<CommandResponse>>;
  moveUpRight: (
    panSpeed: number,
    tiltSpeed: number,
  ) => Promise<PanevoResult<CommandResponse>>;
  moveDownLeft: (
    panSpeed: number,
    tiltSpeed: number,
  ) => Promise<PanevoResult<CommandResponse>>;
  moveDownRight: (
    panSpeed: number,
    tiltSpeed: number,
  ) => Promise<PanevoResult<CommandResponse>>;
  zoomIn: (speed: number) => Promise<PanevoResult<CommandResponse>>;
  zoomOut: (speed: number) => Promise<PanevoResult<CommandResponse>>;
  stop: () => Promise<PanevoResult<CommandResponse>>;
  zoomStop: () => Promise<PanevoResult<CommandResponse>>;
  setFocusMode: (mode: FocusMode) => Promise<PanevoResult<CommandResponse>>;
  focusIn: (speed: number) => Promise<PanevoResult<CommandResponse>>;
  focusOut: (speed: number) => Promise<PanevoResult<CommandResponse>>;
  focusStop: () => Promise<PanevoResult<CommandResponse>>;
  recallPreset: (
    presetNumber: number,
  ) => Promise<PanevoResult<CommandResponse>>;
  storePreset: (
    presetNumber: number,
    presetLabel?: string,
  ) => Promise<PanevoResult<CommandResponse>>;
  removePreset: (
    presetNumber: number,
  ) => Promise<PanevoResult<CommandResponse>>;
}
