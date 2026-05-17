import { Cam } from "onvif";
import type {
  CameraConnectionStatus,
  CameraProfile,
  CommandResponse,
  FocusMode,
  PanevoResult,
} from "@/shared/types";
import { CommandQueue } from "../camera-control/command-queue";

const DEFAULT_TIMEOUT_MS = 5000;
const MAX_PAN_TILT_SPEED = 24;
const MAX_ZOOM_SPEED = 8;
const MAX_FOCUS_SPEED = 8;

const success = <T>(data: T): PanevoResult<T> => ({ ok: true, data });

const failure = <T = never>(
  code: string,
  message: string,
): PanevoResult<T> => ({
  ok: false,
  error: { code, message },
});

const isErrorLike = (error: unknown): error is { message: string } => {
  return typeof error === "object" && error !== null && "message" in error;
};

const errorMessage = (error: unknown): string => {
  if (isErrorLike(error) && typeof error.message === "string") {
    return error.message;
  }

  return String(error);
};

const clamp = (value: number, min: number, max: number): number => {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(max, Math.max(min, value));
};

const scaleSpeed = (speed: number, max: number): number => {
  return clamp(Math.round(speed), 1, max) / max;
};

export class OnvifPtzClient {
  private cam: Cam | null = null;
  private targetKey: string | null = null;
  private readonly queue = new CommandQueue("onvif");

  disconnect(): void {
    this.cam = null;
    this.targetKey = null;
    this.queue.clear();
  }

  async healthCheck(
    camera: CameraProfile,
  ): Promise<PanevoResult<CameraConnectionStatus>> {
    const connectResult = await this.ensureConnected(camera);
    if (!connectResult.ok) {
      return connectResult;
    }

    return success({
      connected: true,
      protocol: camera.protocol,
      controlProtocol: "onvif",
      message: "Camera connected through ONVIF control endpoint.",
      checkedAt: new Date().toISOString(),
      responseVerified: true,
    });
  }

  panLeft(
    camera: CameraProfile,
    speed: number,
  ): Promise<PanevoResult<CommandResponse>> {
    return this.move(
      camera,
      "pan-left",
      -scaleSpeed(speed, MAX_PAN_TILT_SPEED),
      0,
      0,
      { onlySendPanTilt: true },
    );
  }

  panRight(
    camera: CameraProfile,
    speed: number,
  ): Promise<PanevoResult<CommandResponse>> {
    return this.move(
      camera,
      "pan-right",
      scaleSpeed(speed, MAX_PAN_TILT_SPEED),
      0,
      0,
      { onlySendPanTilt: true },
    );
  }

  tiltUp(
    camera: CameraProfile,
    speed: number,
  ): Promise<PanevoResult<CommandResponse>> {
    return this.move(
      camera,
      "tilt-up",
      0,
      scaleSpeed(speed, MAX_PAN_TILT_SPEED),
      0,
      { onlySendPanTilt: true },
    );
  }

  tiltDown(
    camera: CameraProfile,
    speed: number,
  ): Promise<PanevoResult<CommandResponse>> {
    return this.move(
      camera,
      "tilt-down",
      0,
      -scaleSpeed(speed, MAX_PAN_TILT_SPEED),
      0,
      { onlySendPanTilt: true },
    );
  }

  moveUpLeft(
    camera: CameraProfile,
    panSpeed: number,
    tiltSpeed: number,
  ): Promise<PanevoResult<CommandResponse>> {
    return this.move(
      camera,
      "move-up-left",
      -scaleSpeed(panSpeed, MAX_PAN_TILT_SPEED),
      scaleSpeed(tiltSpeed, MAX_PAN_TILT_SPEED),
      0,
      { onlySendPanTilt: true },
    );
  }

  moveUpRight(
    camera: CameraProfile,
    panSpeed: number,
    tiltSpeed: number,
  ): Promise<PanevoResult<CommandResponse>> {
    return this.move(
      camera,
      "move-up-right",
      scaleSpeed(panSpeed, MAX_PAN_TILT_SPEED),
      scaleSpeed(tiltSpeed, MAX_PAN_TILT_SPEED),
      0,
      { onlySendPanTilt: true },
    );
  }

  moveDownLeft(
    camera: CameraProfile,
    panSpeed: number,
    tiltSpeed: number,
  ): Promise<PanevoResult<CommandResponse>> {
    return this.move(
      camera,
      "move-down-left",
      -scaleSpeed(panSpeed, MAX_PAN_TILT_SPEED),
      -scaleSpeed(tiltSpeed, MAX_PAN_TILT_SPEED),
      0,
      { onlySendPanTilt: true },
    );
  }

  moveDownRight(
    camera: CameraProfile,
    panSpeed: number,
    tiltSpeed: number,
  ): Promise<PanevoResult<CommandResponse>> {
    return this.move(
      camera,
      "move-down-right",
      scaleSpeed(panSpeed, MAX_PAN_TILT_SPEED),
      -scaleSpeed(tiltSpeed, MAX_PAN_TILT_SPEED),
      0,
      { onlySendPanTilt: true },
    );
  }

  zoomIn(
    camera: CameraProfile,
    speed: number,
  ): Promise<PanevoResult<CommandResponse>> {
    return this.move(
      camera,
      "zoom-in",
      0,
      0,
      scaleSpeed(speed, MAX_ZOOM_SPEED),
      { onlySendZoom: true },
    );
  }

  zoomOut(
    camera: CameraProfile,
    speed: number,
  ): Promise<PanevoResult<CommandResponse>> {
    return this.move(
      camera,
      "zoom-out",
      0,
      0,
      -scaleSpeed(speed, MAX_ZOOM_SPEED),
      { onlySendZoom: true },
    );
  }

  stop(camera: CameraProfile): Promise<PanevoResult<CommandResponse>> {
    return this.stopMovement(camera, "stop", { panTilt: true, zoom: true });
  }

  zoomStop(camera: CameraProfile): Promise<PanevoResult<CommandResponse>> {
    return this.stopMovement(camera, "zoom-stop", { zoom: true });
  }

  setFocusMode(
    camera: CameraProfile,
    mode: FocusMode,
  ): Promise<PanevoResult<CommandResponse>> {
    const autoFocusMode = mode === "auto" ? "AUTO" : "MANUAL";
    return this.sendCommand(camera, `focus-${mode}`, (cam) =>
      this.invoke("setImagingSettings", (callback) =>
        cam.setImagingSettings(
          {
            focus: { autoFocusMode },
          },
          callback,
        ),
      ),
    );
  }

  focusIn(
    camera: CameraProfile,
    speed: number,
  ): Promise<PanevoResult<CommandResponse>> {
    return this.focusMove(
      camera,
      "focus-in",
      scaleSpeed(speed, MAX_FOCUS_SPEED),
    );
  }

  focusOut(
    camera: CameraProfile,
    speed: number,
  ): Promise<PanevoResult<CommandResponse>> {
    return this.focusMove(
      camera,
      "focus-out",
      -scaleSpeed(speed, MAX_FOCUS_SPEED),
    );
  }

  focusStop(camera: CameraProfile): Promise<PanevoResult<CommandResponse>> {
    return this.sendCommand(
      camera,
      "focus-stop",
      (cam) =>
        this.invoke("imagingStop", (callback) => cam.imagingStop({}, callback)),
      { flushPending: true },
    );
  }

  recallPreset(
    camera: CameraProfile,
    presetNumber: number,
  ): Promise<PanevoResult<CommandResponse>> {
    const presetToken = String(Math.round(clamp(presetNumber, 1, 255)));
    return this.sendCommand(camera, `recall-preset-${presetToken}`, (cam) =>
      this.invoke("gotoPreset", (callback) =>
        cam.gotoPreset({ preset: presetToken }, callback),
      ),
    );
  }

  storePreset(
    camera: CameraProfile,
    presetNumber: number,
    presetLabel?: string,
  ): Promise<PanevoResult<CommandResponse>> {
    const presetToken = String(Math.round(clamp(presetNumber, 1, 255)));
    const presetName =
      typeof presetLabel === "string" && presetLabel.trim().length > 0
        ? presetLabel.trim().slice(0, 32)
        : `Preset ${presetToken}`;
    return this.sendCommand(camera, `store-preset-${presetToken}`, (cam) =>
      this.invoke("setPreset", (callback) =>
        cam.setPreset({ presetToken, presetName }, callback),
      ),
    );
  }

  removePreset(
    camera: CameraProfile,
    presetNumber: number,
  ): Promise<PanevoResult<CommandResponse>> {
    const presetToken = String(Math.round(clamp(presetNumber, 1, 255)));
    return this.sendCommand(camera, `remove-preset-${presetToken}`, (cam) =>
      this.invoke("removePreset", (callback) =>
        cam.removePreset({ presetToken }, callback),
      ),
    );
  }

  private move(
    camera: CameraProfile,
    name: string,
    x: number,
    y: number,
    zoom: number,
    options: { onlySendPanTilt?: boolean; onlySendZoom?: boolean },
  ): Promise<PanevoResult<CommandResponse>> {
    return this.sendCommand(camera, name, (cam) =>
      this.invoke("continuousMove", (callback) =>
        cam.continuousMove(
          {
            x,
            y,
            zoom,
            onlySendPanTilt: options.onlySendPanTilt,
            onlySendZoom: options.onlySendZoom,
          },
          callback,
        ),
      ),
    );
  }

  private stopMovement(
    camera: CameraProfile,
    name: string,
    options: { panTilt?: boolean; zoom?: boolean },
  ): Promise<PanevoResult<CommandResponse>> {
    return this.sendCommand(
      camera,
      name,
      (cam) => this.invoke("stop", (callback) => cam.stop(options, callback)),
      { flushPending: true },
    );
  }

  private focusMove(
    camera: CameraProfile,
    name: string,
    speed: number,
  ): Promise<PanevoResult<CommandResponse>> {
    return this.sendCommand(camera, name, (cam) =>
      this.invoke("imagingMove", (callback) =>
        cam.imagingMove(
          {
            continuous: { speed },
          },
          callback,
        ),
      ),
    );
  }

  private async sendCommand(
    camera: CameraProfile,
    name: string,
    execute: (cam: Cam) => Promise<void>,
    options: { flushPending?: boolean } = {},
  ): Promise<PanevoResult<CommandResponse>> {
    const connectResult = await this.ensureConnected(camera);
    if (!connectResult.ok) {
      return failure(connectResult.error.code, connectResult.error.message);
    }

    return this.queue.enqueue(
      name,
      async () => {
        if (!this.cam) {
          throw new Error("Missing ONVIF client");
        }

        await execute(this.cam);

        return {
          command: `onvif-${name}`,
          queuedAt: new Date().toISOString(),
        };
      },
      options,
    );
  }

  private ensureConnected(
    camera: CameraProfile,
  ): Promise<PanevoResult<CameraConnectionStatus>> {
    const validation = this.validateCamera(camera);
    if (!validation.ok) {
      return Promise.resolve(validation);
    }

    const targetKey = [
      camera.ipAddress,
      camera.onvifPort,
      camera.onvifUsername,
      camera.onvifPassword,
    ].join("|");

    if (this.cam && this.targetKey === targetKey) {
      return Promise.resolve(
        success({
          connected: true,
          protocol: camera.protocol,
          controlProtocol: "onvif",
          message: "Connected",
        }),
      );
    }

    return this.connect(camera, targetKey);
  }

  private connect(
    camera: CameraProfile,
    targetKey: string,
  ): Promise<PanevoResult<CameraConnectionStatus>> {
    return new Promise((resolve) => {
      const failConnect = (error: unknown) => {
        this.cam = null;
        this.targetKey = null;
        resolve(
          failure(
            "ONVIF_CONTROL_CONNECT_FAILED",
            `ONVIF control connect failed: ${errorMessage(error)}`,
          ),
        );
      };

      const onConnect = (cam: Cam) => {
        this.cam = cam;
        this.targetKey = targetKey;
        resolve(
          success({
            connected: true,
            protocol: camera.protocol,
            controlProtocol: "onvif",
            message: `ONVIF control ready for ${camera.ipAddress}:${camera.onvifPort}`,
          }),
        );
      };

      new Cam(
        {
          hostname: camera.ipAddress,
          port: camera.onvifPort,
          username: camera.onvifUsername || undefined,
          password: camera.onvifPassword || undefined,
          timeout: DEFAULT_TIMEOUT_MS,
          preserveAddress: true,
          useWSSecurity: Boolean(camera.onvifUsername || camera.onvifPassword),
        },
        function handleConnect(this: Cam, error) {
          if (error) {
            failConnect(error);
            return;
          }

          // `this` is the connected Cam instance in the onvif callback.
          onConnect(this);
        },
      );
    });
  }

  private invoke(
    action: string,
    call: (callback: (error?: Error | false | null) => void) => void,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const callback = (error?: Error | false | null) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      };

      try {
        call(callback);
      } catch (error) {
        reject(new Error(`${action} failed: ${errorMessage(error)}`));
      }
    });
  }

  private validateCamera(
    camera: CameraProfile,
  ): PanevoResult<CameraConnectionStatus> {
    if (!camera.ipAddress.trim()) {
      return failure("INVALID_CONFIG", "Camera IP address is required.");
    }

    if (!Number.isFinite(camera.onvifPort)) {
      return failure("INVALID_CONFIG", "ONVIF port is required.");
    }

    return success({
      connected: true,
      protocol: camera.protocol,
      controlProtocol: "onvif",
      message: "ONVIF config valid.",
    });
  }
}
