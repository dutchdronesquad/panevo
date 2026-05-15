import type {
  CameraConfig,
  CameraProfile,
  CommandResponse,
  IntegrationConfig,
  IntegrationConfigEntry,
  ObsConnectionInput,
  PanevoAction,
  PanevoActionDispatchResult,
  PanevoActionSafety,
  PanevoFeedbackState,
  PanevoLastCommandFeedback,
  PanevoResult,
} from "@/shared/types";
import { CameraControlService } from "../camera-control/camera-control-service";
import { ConfigService } from "../config/config-service";
import { IntegrationConfigService } from "../integrations/integration-config-service";
import { ObsService } from "../obs/obs-service";

type ConfigStore = Pick<
  ConfigService,
  "getConfig" | "saveConfig" | "getActiveCamera" | "getActiveCameraConfig"
>;

type CameraActions = Pick<
  CameraControlService,
  | "disconnect"
  | "panLeft"
  | "panRight"
  | "tiltUp"
  | "tiltDown"
  | "moveUpLeft"
  | "moveUpRight"
  | "moveDownLeft"
  | "moveDownRight"
  | "zoomIn"
  | "zoomOut"
  | "stop"
  | "zoomStop"
  | "setFocusMode"
  | "focusIn"
  | "focusOut"
  | "focusStop"
  | "recallPreset"
  | "storePreset"
  | "removePreset"
>;

type IntegrationStore = Pick<IntegrationConfigService, "getConfig">;
type ObsActions = Pick<ObsService, "switchScene">;

interface ActionDispatcherDependencies {
  configService?: ConfigStore;
  cameraControlService?: CameraActions;
  integrationConfigService?: IntegrationStore;
  obsService?: ObsActions;
}

const success = <T>(data: T): PanevoResult<T> => ({ ok: true, data });

const failure = <T = never>(
  code: string,
  message: string,
): PanevoResult<T> => ({
  ok: false,
  error: { code, message },
});

const actionSafety: Record<PanevoAction["type"], PanevoActionSafety> = {
  "camera.select": "safe",
  "camera.ptz.move": "guarded",
  "camera.zoom.move": "guarded",
  "camera.stop": "safe",
  "camera.focus.mode": "safe",
  "camera.focus.move": "guarded",
  "preset.recall": "guarded",
  "preset.store": "destructive",
  "preset.remove": "destructive",
  "obs.scene.switch": "guarded",
  "automation.profile.set-enabled": "guarded",
};

const unsupportedActionTypes: PanevoAction["type"][] = [
  "automation.profile.set-enabled",
];

export class ActionDispatcher {
  private readonly configService: ConfigStore;
  private readonly cameraControlService: CameraActions;
  private readonly integrationConfigService: IntegrationStore;
  private readonly obsService: ObsActions;
  private lastCommand?: PanevoLastCommandFeedback;

  constructor(dependencies: ActionDispatcherDependencies = {}) {
    this.configService = dependencies.configService ?? new ConfigService();
    this.cameraControlService =
      dependencies.cameraControlService ?? new CameraControlService();
    this.integrationConfigService =
      dependencies.integrationConfigService ?? new IntegrationConfigService();
    this.obsService = dependencies.obsService ?? new ObsService();
  }

  async getFeedbackState(): Promise<PanevoResult<PanevoFeedbackState>> {
    const configResult = await this.configService.getConfig();
    if (!configResult.ok) {
      return configResult;
    }

    const integrationResult = await this.integrationConfigService.getConfig();
    if (!integrationResult.ok) {
      return integrationResult;
    }

    return success(
      this.createFeedbackState(configResult.data, integrationResult.data),
    );
  }

  async dispatch(
    action: PanevoAction,
  ): Promise<PanevoResult<PanevoActionDispatchResult>> {
    const actionId = action.id ?? `action-${Date.now()}`;
    const requestedAt = action.requestedAt ?? new Date().toISOString();
    const source = action.source ?? "integration";

    if (unsupportedActionTypes.includes(action.type)) {
      return this.failAction(
        action,
        actionId,
        "unsupported",
        "ACTION_UNSUPPORTED",
        `${action.type} is defined but no adapter is implemented yet.`,
      );
    }

    const commandResult = await this.executeAction(action);
    if (!commandResult.ok) {
      return this.failAction(
        action,
        actionId,
        "failed",
        commandResult.error.code,
        commandResult.error.message,
      );
    }

    const completedAt = new Date().toISOString();
    const command =
      "command" in commandResult.data ? commandResult.data.command : undefined;
    this.lastCommand = {
      actionId,
      actionType: action.type,
      status: "completed",
      message: commandResult.data.message,
      completedAt,
      command: command?.command,
    };

    const feedbackResult = await this.getFeedbackState();
    if (!feedbackResult.ok) {
      return feedbackResult;
    }

    return success({
      actionId,
      actionType: action.type,
      source,
      safety: actionSafety[action.type],
      status: "completed",
      requestedAt,
      completedAt,
      cameraId: commandResult.data.cameraId,
      command,
      message: this.lastCommand.message,
      feedback: feedbackResult.data,
    });
  }

  private async executeAction(action: PanevoAction): Promise<
    PanevoResult<{
      cameraId?: string;
      command?: CommandResponse;
      message: string;
    }>
  > {
    if (action.type === "camera.select") {
      return this.selectCamera(action.cameraId);
    }
    if (action.type === "obs.scene.switch") {
      return this.switchObsScene(action.sceneName);
    }
    if (action.type === "automation.profile.set-enabled") {
      return failure(
        "ACTION_UNSUPPORTED",
        `${action.type} is defined but no adapter is implemented yet.`,
      );
    }

    const cameraResult = await this.configService.getActiveCameraConfig();
    if (!cameraResult.ok) {
      return cameraResult;
    }

    const camera = cameraResult.data;
    const commandResult = await this.executeCameraAction(camera, action);
    if (!commandResult.ok) {
      return commandResult;
    }

    return success({
      cameraId: camera.id,
      command: commandResult.data,
      message: commandResult.data.command,
    });
  }

  private async selectCamera(
    cameraId: string,
  ): Promise<PanevoResult<{ cameraId: string; message: string }>> {
    const configResult = await this.configService.getConfig();
    if (!configResult.ok) {
      return configResult;
    }

    const camera = configResult.data.cameras.find(
      (candidate) => candidate.id === cameraId,
    );
    if (!camera) {
      return failure(
        "ACTION_CAMERA_NOT_FOUND",
        "The requested camera profile does not exist.",
      );
    }

    const previousCameraId = configResult.data.activeCameraId;
    const saved = await this.configService.saveConfig({
      ...configResult.data,
      activeCameraId: camera.id,
    });
    if (!saved.ok) {
      return saved;
    }

    if (previousCameraId !== camera.id) {
      this.cameraControlService.disconnect();
    }

    return success({
      cameraId: camera.id,
      message: `Selected ${camera.label}`,
    });
  }

  private executeCameraAction(
    camera: CameraProfile,
    action: Exclude<
      PanevoAction,
      | { type: "camera.select" }
      | { type: "obs.scene.switch" }
      | { type: "automation.profile.set-enabled" }
    >,
  ): Promise<PanevoResult<CommandResponse>> {
    switch (action.type) {
      case "camera.ptz.move":
        return this.dispatchPtzMove(camera, action);
      case "camera.zoom.move":
        return action.direction === "in"
          ? this.cameraControlService.zoomIn(camera, action.speed)
          : this.cameraControlService.zoomOut(camera, action.speed);
      case "camera.stop":
        return this.dispatchStop(camera, action.target);
      case "camera.focus.mode":
        return this.cameraControlService.setFocusMode(camera, action.mode);
      case "camera.focus.move":
        return action.direction === "in"
          ? this.cameraControlService.focusIn(camera, action.speed)
          : this.cameraControlService.focusOut(camera, action.speed);
      case "preset.recall":
        return this.cameraControlService.recallPreset(
          camera,
          action.presetNumber,
        );
      case "preset.store":
        return this.cameraControlService.storePreset(
          camera,
          action.presetNumber,
          action.presetLabel,
        );
      case "preset.remove":
        return this.cameraControlService.removePreset(
          camera,
          action.presetNumber,
        );
    }
  }

  private async switchObsScene(
    sceneName: string,
  ): Promise<PanevoResult<{ command: CommandResponse; message: string }>> {
    const obsInputResult = await this.getObsConnectionInput();
    if (!obsInputResult.ok) {
      return obsInputResult;
    }

    const commandResult = await this.obsService.switchScene(
      obsInputResult.data,
      sceneName,
    );
    if (!commandResult.ok) {
      return commandResult;
    }

    return success({
      command: commandResult.data,
      message: commandResult.data.command,
    });
  }

  private async getObsConnectionInput(): Promise<
    PanevoResult<ObsConnectionInput>
  > {
    const configResult = await this.integrationConfigService.getConfig();
    if (!configResult.ok) {
      return configResult;
    }

    const obsIntegration = configResult.data.integrations.find(
      (integration) => integration.integrationId === "obs",
    );
    if (!obsIntegration || obsIntegration.lifecycleState === "not-configured") {
      return failure(
        "OBS_NOT_CONFIGURED",
        "Configure OBS before dispatching OBS scene actions.",
      );
    }
    if (!["enabled", "connected"].includes(obsIntegration.lifecycleState)) {
      return failure(
        "OBS_NOT_ENABLED",
        "Enable OBS in Control before dispatching OBS scene actions.",
      );
    }

    return this.normalizeObsSettings(obsIntegration);
  }

  private normalizeObsSettings(
    integration: IntegrationConfigEntry,
  ): PanevoResult<ObsConnectionInput> {
    const host =
      typeof integration.settings.host === "string"
        ? integration.settings.host.trim()
        : "";
    const rawPort = integration.settings.port;
    const port =
      typeof rawPort === "number"
        ? rawPort
        : typeof rawPort === "string"
          ? Number(rawPort)
          : Number.NaN;

    if (!host || !Number.isFinite(port)) {
      return failure(
        "OBS_INVALID_SETTINGS",
        "OBS host and websocket port must be configured before scene actions can run.",
      );
    }

    return success({
      host,
      port,
      password:
        typeof integration.settings.password === "string" &&
        integration.settings.password
          ? integration.settings.password
          : undefined,
      secure:
        typeof integration.settings.secure === "boolean"
          ? integration.settings.secure
          : undefined,
    });
  }

  private dispatchPtzMove(
    camera: CameraProfile,
    action: Extract<PanevoAction, { type: "camera.ptz.move" }>,
  ): Promise<PanevoResult<CommandResponse>> {
    switch (action.direction) {
      case "pan-left":
        return this.cameraControlService.panLeft(camera, action.speed ?? 1);
      case "pan-right":
        return this.cameraControlService.panRight(camera, action.speed ?? 1);
      case "tilt-up":
        return this.cameraControlService.tiltUp(camera, action.speed ?? 1);
      case "tilt-down":
        return this.cameraControlService.tiltDown(camera, action.speed ?? 1);
      case "up-left":
        return this.cameraControlService.moveUpLeft(
          camera,
          action.panSpeed ?? action.speed ?? 1,
          action.tiltSpeed ?? action.speed ?? 1,
        );
      case "up-right":
        return this.cameraControlService.moveUpRight(
          camera,
          action.panSpeed ?? action.speed ?? 1,
          action.tiltSpeed ?? action.speed ?? 1,
        );
      case "down-left":
        return this.cameraControlService.moveDownLeft(
          camera,
          action.panSpeed ?? action.speed ?? 1,
          action.tiltSpeed ?? action.speed ?? 1,
        );
      case "down-right":
        return this.cameraControlService.moveDownRight(
          camera,
          action.panSpeed ?? action.speed ?? 1,
          action.tiltSpeed ?? action.speed ?? 1,
        );
    }
  }

  private async dispatchStop(
    camera: CameraProfile,
    target: Extract<PanevoAction, { type: "camera.stop" }>["target"],
  ): Promise<PanevoResult<CommandResponse>> {
    if (target === "movement") {
      return this.cameraControlService.stop(camera);
    }
    if (target === "zoom") {
      return this.cameraControlService.zoomStop(camera);
    }
    if (target === "focus") {
      return this.cameraControlService.focusStop(camera);
    }

    const movementStop = await this.cameraControlService.stop(camera);
    if (!movementStop.ok) {
      return movementStop;
    }

    const zoomStop = await this.cameraControlService.zoomStop(camera);
    if (!zoomStop.ok) {
      return zoomStop;
    }

    const focusStop = await this.cameraControlService.focusStop(camera);
    if (!focusStop.ok) {
      return focusStop;
    }

    return success({
      command: "stop-all",
      queuedAt: movementStop.data.queuedAt,
    });
  }

  private async failAction(
    action: PanevoAction,
    actionId: string,
    status: PanevoLastCommandFeedback["status"],
    code: string,
    message: string,
  ): Promise<PanevoResult<PanevoActionDispatchResult>> {
    this.lastCommand = {
      actionId,
      actionType: action.type,
      status,
      message,
      completedAt: new Date().toISOString(),
    };

    return failure(code, message);
  }

  private createFeedbackState(
    config: CameraConfig,
    integrationConfig: IntegrationConfig,
  ): PanevoFeedbackState {
    const activeCamera = this.configService.getActiveCamera(config);

    return {
      activeCamera: activeCamera
        ? {
            id: activeCamera.id,
            label: activeCamera.label,
            controlProtocol: activeCamera.controlProtocol,
            syncProtocol: activeCamera.syncProtocol,
          }
        : null,
      connection: activeCamera
        ? {
            status: "unknown",
            message: "Connection has not been checked by the feedback layer.",
            controlProtocol: activeCamera.controlProtocol,
          }
        : {
            status: "disconnected",
            message: "No active camera configured.",
          },
      presets: activeCamera?.presets ?? [],
      integrations: integrationConfig.integrations.map((integration) => ({
        id: integration.id,
        integrationId: integration.integrationId,
        lifecycleState: integration.lifecycleState,
        lastError: integration.lastError,
      })),
      lastCommand: this.lastCommand,
      updatedAt: new Date().toISOString(),
    };
  }
}
