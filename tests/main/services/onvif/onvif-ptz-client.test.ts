import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CameraProfile } from "../../../../src/shared/types";

type Callback = (error?: Error | false | null) => void;

type FakeCamInstance = {
  continuousMove: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  setImagingSettings: ReturnType<typeof vi.fn>;
  imagingMove: ReturnType<typeof vi.fn>;
  imagingStop: ReturnType<typeof vi.fn>;
  gotoPreset: ReturnType<typeof vi.fn>;
  setPreset: ReturnType<typeof vi.fn>;
  removePreset: ReturnType<typeof vi.fn>;
};

const onvifMock = vi.hoisted(() => {
  const createCam = (): FakeCamInstance => ({
    continuousMove: vi.fn((_options: unknown, callback: Callback) =>
      callback(null),
    ),
    stop: vi.fn((_options: unknown, callback: Callback) => callback(null)),
    setImagingSettings: vi.fn((_options: unknown, callback: Callback) =>
      callback(null),
    ),
    imagingMove: vi.fn((_options: unknown, callback: Callback) =>
      callback(null),
    ),
    imagingStop: vi.fn((_options: unknown, callback: Callback) =>
      callback(null),
    ),
    gotoPreset: vi.fn((_options: unknown, callback: Callback) =>
      callback(null),
    ),
    setPreset: vi.fn((_options: unknown, callback: Callback) => callback(null)),
    removePreset: vi.fn((_options: unknown, callback: Callback) =>
      callback(null),
    ),
  });

  const state: {
    cam: FakeCamInstance;
    camOptions: unknown[];
    connectError: Error | null;
  } = {
    cam: createCam(),
    camOptions: [],
    connectError: null,
  };

  return {
    createCam,
    state,
    Cam: vi.fn(function Cam(
      this: FakeCamInstance,
      options: unknown,
      callback: (this: FakeCamInstance, error?: Error | null) => void,
    ) {
      state.camOptions.push(options);

      if (state.connectError) {
        callback.call(this, state.connectError);
        return;
      }

      Object.assign(this, state.cam);
      callback.call(this, null);
    }),
  };
});

vi.mock("onvif", () => ({
  Cam: onvifMock.Cam,
}));

const { OnvifPtzClient } =
  await import("../../../../src/main/services/onvif/onvif-ptz-client");

const createCamera = (
  overrides: Partial<CameraProfile> = {},
): CameraProfile => ({
  id: "camera-a",
  label: "Camera A",
  ipAddress: "192.168.1.20",
  port: 52381,
  onvifPort: 8080,
  onvifUsername: "operator",
  onvifPassword: "secret",
  controlProtocol: "onvif",
  syncProtocol: "onvif",
  protocol: "udp",
  healthCheckMode: "visca-inquiry",
  presets: [],
  ...overrides,
});

describe("OnvifPtzClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    onvifMock.state.cam = onvifMock.createCam();
    onvifMock.state.camOptions = [];
    onvifMock.state.connectError = null;
  });

  it("returns invalid config without connecting", async () => {
    const client = new OnvifPtzClient();

    await expect(
      client.healthCheck(createCamera({ ipAddress: "   " })),
    ).resolves.toEqual({
      ok: false,
      error: {
        code: "INVALID_CONFIG",
        message: "Camera IP address is required.",
      },
    });

    expect(onvifMock.Cam).not.toHaveBeenCalled();
  });

  it("returns structured connection failures", async () => {
    onvifMock.state.connectError = new Error("auth failed");
    const client = new OnvifPtzClient();

    await expect(client.healthCheck(createCamera())).resolves.toEqual({
      ok: false,
      error: {
        code: "ONVIF_CONTROL_CONNECT_FAILED",
        message: "ONVIF control connect failed: auth failed",
      },
    });
  });

  it("connects with credentials and reports verified health", async () => {
    const client = new OnvifPtzClient();

    const result = await client.healthCheck(createCamera());

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(onvifMock.state.camOptions[0]).toEqual({
      hostname: "192.168.1.20",
      port: 8080,
      username: "operator",
      password: "secret",
      timeout: 5000,
      preserveAddress: true,
      useWSSecurity: true,
    });
    expect(result.data).toMatchObject({
      connected: true,
      protocol: "udp",
      controlProtocol: "onvif",
      message: "Camera connected through ONVIF control endpoint.",
      responseVerified: true,
    });
  });

  it("reuses the active ONVIF connection for the same target", async () => {
    const client = new OnvifPtzClient();
    const camera = createCamera();

    await client.panLeft(camera, 12);
    await client.panRight(camera, 12);

    expect(onvifMock.Cam).toHaveBeenCalledOnce();
    expect(onvifMock.state.cam.continuousMove).toHaveBeenCalledTimes(2);
  });

  it("sends scaled pan, tilt, diagonal, and zoom movement commands", async () => {
    const client = new OnvifPtzClient();
    const camera = createCamera();

    await client.panLeft(camera, 12);
    await client.tiltUp(camera, 24);
    await client.moveDownRight(camera, 6, 18);
    await client.zoomOut(camera, 4);

    expect(onvifMock.state.cam.continuousMove).toHaveBeenNthCalledWith(
      1,
      {
        x: -0.5,
        y: 0,
        zoom: 0,
        onlySendPanTilt: true,
        onlySendZoom: undefined,
      },
      expect.any(Function),
    );
    expect(onvifMock.state.cam.continuousMove).toHaveBeenNthCalledWith(
      2,
      {
        x: 0,
        y: 1,
        zoom: 0,
        onlySendPanTilt: true,
        onlySendZoom: undefined,
      },
      expect.any(Function),
    );
    expect(onvifMock.state.cam.continuousMove).toHaveBeenNthCalledWith(
      3,
      {
        x: 0.25,
        y: -0.75,
        zoom: 0,
        onlySendPanTilt: true,
        onlySendZoom: undefined,
      },
      expect.any(Function),
    );
    expect(onvifMock.state.cam.continuousMove).toHaveBeenNthCalledWith(
      4,
      {
        x: 0,
        y: 0,
        zoom: -0.5,
        onlySendPanTilt: undefined,
        onlySendZoom: true,
      },
      expect.any(Function),
    );
  });

  it("sends stop and zoom-stop commands", async () => {
    const client = new OnvifPtzClient();
    const camera = createCamera();

    await client.stop(camera);
    await client.zoomStop(camera);

    expect(onvifMock.state.cam.stop).toHaveBeenNthCalledWith(
      1,
      { panTilt: true, zoom: true },
      expect.any(Function),
    );
    expect(onvifMock.state.cam.stop).toHaveBeenNthCalledWith(
      2,
      { zoom: true },
      expect.any(Function),
    );
  });

  it("sends focus mode, focus movement, and focus stop commands", async () => {
    const client = new OnvifPtzClient();
    const camera = createCamera();

    await client.setFocusMode(camera, "manual");
    await client.focusIn(camera, 8);
    await client.focusOut(camera, 4);
    await client.focusStop(camera);

    expect(onvifMock.state.cam.setImagingSettings).toHaveBeenCalledWith(
      { focus: { autoFocusMode: "MANUAL" } },
      expect.any(Function),
    );
    expect(onvifMock.state.cam.imagingMove).toHaveBeenNthCalledWith(
      1,
      { continuous: { speed: 1 } },
      expect.any(Function),
    );
    expect(onvifMock.state.cam.imagingMove).toHaveBeenNthCalledWith(
      2,
      { continuous: { speed: -0.5 } },
      expect.any(Function),
    );
    expect(onvifMock.state.cam.imagingStop).toHaveBeenCalledWith(
      {},
      expect.any(Function),
    );
  });

  it("sends preset recall, store, and remove commands with clamped tokens", async () => {
    const client = new OnvifPtzClient();
    const camera = createCamera();

    await client.recallPreset(camera, 300);
    await client.storePreset(camera, 2, " Finish Gate ");
    await client.removePreset(camera, -10);

    expect(onvifMock.state.cam.gotoPreset).toHaveBeenCalledWith(
      { preset: "255" },
      expect.any(Function),
    );
    expect(onvifMock.state.cam.setPreset).toHaveBeenCalledWith(
      { presetToken: "2", presetName: "Finish Gate" },
      expect.any(Function),
    );
    expect(onvifMock.state.cam.removePreset).toHaveBeenCalledWith(
      { presetToken: "1" },
      expect.any(Function),
    );
  });

  it("returns structured command failures", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    onvifMock.state.cam.continuousMove.mockImplementationOnce(
      (_options: unknown, callback: Callback) =>
        callback(new Error("camera busy")),
    );
    const client = new OnvifPtzClient();

    await expect(client.panLeft(createCamera(), 12)).resolves.toEqual({
      ok: false,
      error: {
        code: "COMMAND_FAILED",
        message: "ONVIF command failed: pan-left",
      },
    });
    expect(consoleError).toHaveBeenCalledWith(
      "[onvif-queue] Command failed: pan-left",
      expect.any(Error),
    );
    consoleError.mockRestore();
  });

  it("disconnects and reconnects on the next command", async () => {
    const client = new OnvifPtzClient();
    const camera = createCamera();

    await client.panLeft(camera, 12);
    client.disconnect();
    await client.panRight(camera, 12);

    expect(onvifMock.Cam).toHaveBeenCalledTimes(2);
  });
});
