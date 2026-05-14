import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  CameraConfig,
  CameraProfile,
  CommandResponse,
  IntegrationConfig,
  PanevoResult,
} from "../../../../src/shared/types";
import { ActionDispatcher } from "../../../../src/main/services/actions/action-dispatcher";

vi.mock("electron", () => ({
  app: {
    getPath: () => "/tmp",
  },
}));

const success = <T>(data: T): PanevoResult<T> => ({ ok: true, data });

const failure = <T = never>(
  code: string,
  message: string,
): PanevoResult<T> => ({
  ok: false,
  error: { code, message },
});

const command = (name: string): PanevoResult<CommandResponse> =>
  success({ command: name, queuedAt: "2026-05-14T10:00:00.000Z" });

const createCamera = (
  id: string,
  overrides: Partial<CameraProfile> = {},
): CameraProfile => ({
  id,
  label: id === "camera-a" ? "Camera A" : "Camera B",
  ipAddress: "192.168.1.20",
  port: 52381,
  onvifPort: 8080,
  onvifUsername: "",
  onvifPassword: "",
  controlProtocol: "visca",
  syncProtocol: "onvif",
  protocol: "udp",
  healthCheckMode: "visca-inquiry",
  presets: [
    {
      id: "preset-1",
      label: "Wide",
      cameraPreset: 1,
    },
  ],
  ...overrides,
});

describe("ActionDispatcher", () => {
  let config: CameraConfig;
  let integrationConfig: IntegrationConfig;
  let cameraControlService: {
    disconnect: ReturnType<typeof vi.fn>;
    panLeft: ReturnType<typeof vi.fn>;
    panRight: ReturnType<typeof vi.fn>;
    tiltUp: ReturnType<typeof vi.fn>;
    tiltDown: ReturnType<typeof vi.fn>;
    moveUpLeft: ReturnType<typeof vi.fn>;
    moveUpRight: ReturnType<typeof vi.fn>;
    moveDownLeft: ReturnType<typeof vi.fn>;
    moveDownRight: ReturnType<typeof vi.fn>;
    zoomIn: ReturnType<typeof vi.fn>;
    zoomOut: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
    zoomStop: ReturnType<typeof vi.fn>;
    setFocusMode: ReturnType<typeof vi.fn>;
    focusIn: ReturnType<typeof vi.fn>;
    focusOut: ReturnType<typeof vi.fn>;
    focusStop: ReturnType<typeof vi.fn>;
    recallPreset: ReturnType<typeof vi.fn>;
    storePreset: ReturnType<typeof vi.fn>;
    removePreset: ReturnType<typeof vi.fn>;
  };

  const createDispatcher = () => {
    const configService = {
      getConfig: vi.fn(async () => success(config)),
      saveConfig: vi.fn(async (nextConfig: CameraConfig) => {
        config = nextConfig;
        return success(config);
      }),
      getActiveCamera: vi.fn((cameraConfig: CameraConfig) => {
        return (
          cameraConfig.cameras.find(
            (camera) => camera.id === cameraConfig.activeCameraId,
          ) ??
          cameraConfig.cameras[0] ??
          null
        );
      }),
      getActiveCameraConfig: vi.fn(async () => {
        const activeCamera =
          config.cameras.find(
            (camera) => camera.id === config.activeCameraId,
          ) ??
          config.cameras[0] ??
          null;

        return activeCamera
          ? success(activeCamera)
          : failure("NO_ACTIVE_CAMERA", "No camera profile is configured.");
      }),
    };
    const integrationConfigService = {
      getConfig: vi.fn(async () => success(integrationConfig)),
    };

    return {
      dispatcher: new ActionDispatcher({
        configService,
        cameraControlService: cameraControlService as never,
        integrationConfigService,
      }),
      configService,
    };
  };

  beforeEach(() => {
    config = {
      activeCameraId: "camera-a",
      cameras: [createCamera("camera-a"), createCamera("camera-b")],
    };
    integrationConfig = {
      integrations: [
        {
          id: "integration-obs",
          integrationId: "obs",
          lifecycleState: "enabled",
          settings: {},
          updatedAt: "2026-05-14T10:00:00.000Z",
        },
      ],
    };
    cameraControlService = {
      disconnect: vi.fn(),
      panLeft: vi.fn(async () => command("pan-left")),
      panRight: vi.fn(async () => command("pan-right")),
      tiltUp: vi.fn(async () => command("tilt-up")),
      tiltDown: vi.fn(async () => command("tilt-down")),
      moveUpLeft: vi.fn(async () => command("move-up-left")),
      moveUpRight: vi.fn(async () => command("move-up-right")),
      moveDownLeft: vi.fn(async () => command("move-down-left")),
      moveDownRight: vi.fn(async () => command("move-down-right")),
      zoomIn: vi.fn(async () => command("zoom-in")),
      zoomOut: vi.fn(async () => command("zoom-out")),
      stop: vi.fn(async () => command("stop")),
      zoomStop: vi.fn(async () => command("zoom-stop")),
      setFocusMode: vi.fn(async () => command("focus-mode")),
      focusIn: vi.fn(async () => command("focus-in")),
      focusOut: vi.fn(async () => command("focus-out")),
      focusStop: vi.fn(async () => command("focus-stop")),
      recallPreset: vi.fn(async () => command("recall-preset-1")),
      storePreset: vi.fn(async () => command("store-preset-1")),
      removePreset: vi.fn(async () => command("remove-preset-1")),
    };
  });

  it("selects the active camera through the action layer", async () => {
    const { dispatcher, configService } = createDispatcher();

    const result = await dispatcher.dispatch({
      id: "select-camera-b",
      type: "camera.select",
      source: "integration",
      cameraId: "camera-b",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(config.activeCameraId).toBe("camera-b");
    expect(configService.saveConfig).toHaveBeenCalledWith({
      ...config,
      activeCameraId: "camera-b",
    });
    expect(cameraControlService.disconnect).toHaveBeenCalledTimes(1);
    expect(result.data.safety).toBe("safe");
    expect(result.data.feedback.activeCamera?.id).toBe("camera-b");
    expect(result.data.feedback.integrations[0]).toMatchObject({
      integrationId: "obs",
      lifecycleState: "enabled",
    });
  });

  it("routes emergency stop through movement, zoom, and focus stop", async () => {
    const { dispatcher } = createDispatcher();

    const result = await dispatcher.dispatch({
      id: "stop-all",
      type: "camera.stop",
      source: "integration",
      target: "all",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(cameraControlService.stop).toHaveBeenCalledWith(config.cameras[0]);
    expect(cameraControlService.zoomStop).toHaveBeenCalledWith(
      config.cameras[0],
    );
    expect(cameraControlService.focusStop).toHaveBeenCalledWith(
      config.cameras[0],
    );
    expect(result.data.safety).toBe("safe");
    expect(result.data.command?.command).toBe("stop-all");
  });

  it("short-circuits stop-all when movement stop fails", async () => {
    cameraControlService.stop.mockResolvedValueOnce(
      failure("STOP_FAILED", "Unable to stop movement."),
    );
    const { dispatcher } = createDispatcher();

    const result = await dispatcher.dispatch({
      id: "stop-all-failure",
      type: "camera.stop",
      source: "integration",
      target: "all",
    });
    const feedback = await dispatcher.getFeedbackState();

    expect(result).toEqual({
      ok: false,
      error: {
        code: "STOP_FAILED",
        message: "Unable to stop movement.",
      },
    });
    expect(cameraControlService.zoomStop).not.toHaveBeenCalled();
    expect(cameraControlService.focusStop).not.toHaveBeenCalled();
    expect(feedback.ok).toBe(true);
    if (!feedback.ok) return;
    expect(feedback.data.lastCommand).toMatchObject({
      actionId: "stop-all-failure",
      status: "failed",
    });
  });

  it("routes PTZ, zoom, and focus actions with the normalized payload", async () => {
    const { dispatcher } = createDispatcher();

    const diagonalResult = await dispatcher.dispatch({
      id: "move-diagonal",
      type: "camera.ptz.move",
      source: "integration",
      direction: "down-right",
      panSpeed: 8,
      tiltSpeed: 10,
    });
    const zoomResult = await dispatcher.dispatch({
      id: "zoom-in",
      type: "camera.zoom.move",
      source: "integration",
      direction: "in",
      speed: 4,
    });
    const focusModeResult = await dispatcher.dispatch({
      id: "focus-mode",
      type: "camera.focus.mode",
      source: "integration",
      mode: "manual",
    });
    const focusMoveResult = await dispatcher.dispatch({
      id: "focus-out",
      type: "camera.focus.move",
      source: "integration",
      direction: "out",
      speed: 3,
    });

    expect(diagonalResult.ok).toBe(true);
    expect(zoomResult.ok).toBe(true);
    expect(focusModeResult.ok).toBe(true);
    expect(focusMoveResult.ok).toBe(true);

    expect(cameraControlService.moveDownRight).toHaveBeenCalledWith(
      config.cameras[0],
      8,
      10,
    );
    expect(cameraControlService.zoomIn).toHaveBeenCalledWith(
      config.cameras[0],
      4,
    );
    expect(cameraControlService.setFocusMode).toHaveBeenCalledWith(
      config.cameras[0],
      "manual",
    );
    expect(cameraControlService.focusOut).toHaveBeenCalledWith(
      config.cameras[0],
      3,
    );
    if (!diagonalResult.ok || !focusModeResult.ok) return;
    expect(diagonalResult.data.safety).toBe("guarded");
    expect(focusModeResult.data.safety).toBe("safe");
  });

  it("uses the fallback speed for PTZ movement when speed is omitted", async () => {
    const { dispatcher } = createDispatcher();

    const result = await dispatcher.dispatch({
      id: "pan-left-default",
      type: "camera.ptz.move",
      source: "integration",
      direction: "pan-left",
    });

    expect(result.ok).toBe(true);
    expect(cameraControlService.panLeft).toHaveBeenCalledWith(
      config.cameras[0],
      1,
    );
  });

  it("routes preset recall and store through CameraControlService", async () => {
    const { dispatcher } = createDispatcher();

    const recallResult = await dispatcher.dispatch({
      id: "recall-preset",
      type: "preset.recall",
      source: "integration",
      presetNumber: 1,
    });
    const storeResult = await dispatcher.dispatch({
      id: "store-preset",
      type: "preset.store",
      source: "integration",
      presetNumber: 1,
      presetLabel: "Wide",
    });

    expect(recallResult.ok).toBe(true);
    expect(storeResult.ok).toBe(true);
    if (!recallResult.ok || !storeResult.ok) return;

    expect(cameraControlService.recallPreset).toHaveBeenCalledWith(
      config.cameras[0],
      1,
    );
    expect(cameraControlService.storePreset).toHaveBeenCalledWith(
      config.cameras[0],
      1,
      "Wide",
    );
    expect(recallResult.data.safety).toBe("guarded");
    expect(storeResult.data.safety).toBe("destructive");
  });

  it("routes preset removal as a destructive action", async () => {
    const { dispatcher } = createDispatcher();

    const result = await dispatcher.dispatch({
      id: "remove-preset",
      type: "preset.remove",
      source: "integration",
      presetNumber: 1,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(cameraControlService.removePreset).toHaveBeenCalledWith(
      config.cameras[0],
      1,
    );
    expect(result.data.safety).toBe("destructive");
  });

  it("returns active feedback without dispatching an action", async () => {
    const { dispatcher } = createDispatcher();

    const feedback = await dispatcher.getFeedbackState();

    expect(feedback.ok).toBe(true);
    if (!feedback.ok) return;
    expect(feedback.data).toMatchObject({
      activeCamera: {
        id: "camera-a",
        label: "Camera A",
        controlProtocol: "visca",
        syncProtocol: "onvif",
      },
      connection: {
        status: "unknown",
        message: "Connection has not been checked by the feedback layer.",
        controlProtocol: "visca",
      },
      integrations: [
        {
          id: "integration-obs",
          integrationId: "obs",
          lifecycleState: "enabled",
        },
      ],
    });
    expect(feedback.data.presets).toEqual(config.cameras[0].presets);
    expect(feedback.data.lastCommand).toBeUndefined();
  });

  it("returns disconnected feedback when no active camera exists", async () => {
    config = {
      activeCameraId: "",
      cameras: [],
    };
    const { dispatcher } = createDispatcher();

    const feedback = await dispatcher.getFeedbackState();

    expect(feedback.ok).toBe(true);
    if (!feedback.ok) return;
    expect(feedback.data.activeCamera).toBeNull();
    expect(feedback.data.connection).toMatchObject({
      status: "disconnected",
      message: "No active camera configured.",
    });
    expect(feedback.data.presets).toEqual([]);
  });

  it("returns a structured error when no active camera can handle an action", async () => {
    config = {
      activeCameraId: "",
      cameras: [],
    };
    const { dispatcher } = createDispatcher();

    const result = await dispatcher.dispatch({
      id: "recall-without-camera",
      type: "preset.recall",
      source: "integration",
      presetNumber: 1,
    });

    expect(result).toEqual({
      ok: false,
      error: {
        code: "NO_ACTIVE_CAMERA",
        message: "No camera profile is configured.",
      },
    });
  });

  it("returns a structured error when camera selection targets an unknown camera", async () => {
    const { dispatcher, configService } = createDispatcher();

    const result = await dispatcher.dispatch({
      id: "select-missing-camera",
      type: "camera.select",
      source: "integration",
      cameraId: "camera-missing",
    });

    expect(result).toEqual({
      ok: false,
      error: {
        code: "ACTION_CAMERA_NOT_FOUND",
        message: "The requested camera profile does not exist.",
      },
    });
    expect(configService.saveConfig).not.toHaveBeenCalled();
    expect(cameraControlService.disconnect).not.toHaveBeenCalled();
  });

  it("returns a structured unsupported result for future OBS actions", async () => {
    const { dispatcher } = createDispatcher();

    const result = await dispatcher.dispatch({
      id: "switch-obs-scene",
      type: "obs.scene.switch",
      source: "integration",
      sceneName: "Race",
    });
    const feedback = await dispatcher.getFeedbackState();

    expect(result).toEqual({
      ok: false,
      error: {
        code: "ACTION_UNSUPPORTED",
        message:
          "obs.scene.switch is defined but no adapter is implemented yet.",
      },
    });
    expect(feedback.ok).toBe(true);
    if (!feedback.ok) return;
    expect(feedback.data.lastCommand).toMatchObject({
      actionId: "switch-obs-scene",
      actionType: "obs.scene.switch",
      status: "unsupported",
    });
  });
});
