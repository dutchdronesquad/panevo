import dgram from 'node:dgram';
import type { CameraConfig, CameraConnectionStatus, CommandResponse, PanevoResult } from '../../../shared/types';
import {
  buildPanTiltCommand,
  buildRecallPresetCommand,
  buildStopCommand,
  buildStorePresetCommand,
  buildZoomCommand,
  buildZoomStopCommand,
} from './visca-commands';
import { ViscaQueue } from './visca-queue';
import type { PanDirection, TiltDirection } from './visca-types';

const success = <T>(data: T): PanevoResult<T> => ({ ok: true, data });

const failure = <T = never>(code: string, message: string): PanevoResult<T> => ({
  ok: false,
  error: { code, message },
});

const clampInteger = (value: number, min: number, max: number): number => {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(max, Math.max(min, Math.round(value)));
};

export class ViscaClient {
  private config: CameraConfig | null = null;
  private socket: dgram.Socket | null = null;
  private connected = false;
  private readonly queue = new ViscaQueue();

  async connect(config: CameraConfig): Promise<PanevoResult<CameraConnectionStatus>> {
    const validation = this.validateConfig(config);
    if (!validation.ok) {
      return validation;
    }

    this.config = validation.data;

    if (this.config.mockMode) {
      this.connected = true;
      console.info('[visca] Mock connection active');
      return success({
        connected: true,
        mockMode: true,
        protocol: this.config.protocol,
        message: 'Mock mode active',
      });
    }

    if (this.config.protocol === 'tcp') {
      return failure('TCP_NOT_IMPLEMENTED', 'TCP VISCA is reserved for future support. Use UDP for the MVP.');
    }

    this.disconnectSocket();

    try {
      this.socket = dgram.createSocket('udp4');
      this.socket.on('error', (error) => {
        console.error('[visca] UDP socket error', error);
        this.connected = false;
      });
      this.connected = true;

      return success({
        connected: true,
        mockMode: false,
        protocol: 'udp',
        message: `UDP transport ready for ${this.config.ipAddress}:${this.config.port}`,
      });
    } catch (error) {
      console.error('[visca] Failed to create UDP socket', error);
      return failure('SOCKET_CREATE_FAILED', 'Unable to create UDP socket for VISCA transport.');
    }
  }

  async ensureConnected(config: CameraConfig): Promise<PanevoResult<CameraConnectionStatus>> {
    const activeConfig = this.config;
    const sameTarget =
      activeConfig &&
      activeConfig.ipAddress === config.ipAddress &&
      activeConfig.port === config.port &&
      activeConfig.protocol === config.protocol &&
      activeConfig.mockMode === config.mockMode;

    if (this.connected && activeConfig && sameTarget) {
      return success({
        connected: true,
        mockMode: activeConfig.mockMode,
        protocol: activeConfig.protocol,
        message: activeConfig.mockMode ? 'Mock mode active' : 'Connected',
      });
    }

    return this.connect(config);
  }

  disconnect(): void {
    this.connected = false;
    this.queue.clear();
    this.disconnectSocket();
  }

  panLeft(speed: number): Promise<PanevoResult<CommandResponse>> {
    return this.panTilt('pan-left', 'left', 'stop', speed, speed);
  }

  panRight(speed: number): Promise<PanevoResult<CommandResponse>> {
    return this.panTilt('pan-right', 'right', 'stop', speed, speed);
  }

  tiltUp(speed: number): Promise<PanevoResult<CommandResponse>> {
    return this.panTilt('tilt-up', 'stop', 'up', speed, speed);
  }

  tiltDown(speed: number): Promise<PanevoResult<CommandResponse>> {
    return this.panTilt('tilt-down', 'stop', 'down', speed, speed);
  }

  moveUpLeft(panSpeed: number, tiltSpeed: number): Promise<PanevoResult<CommandResponse>> {
    return this.panTilt('move-up-left', 'left', 'up', panSpeed, tiltSpeed);
  }

  moveUpRight(panSpeed: number, tiltSpeed: number): Promise<PanevoResult<CommandResponse>> {
    return this.panTilt('move-up-right', 'right', 'up', panSpeed, tiltSpeed);
  }

  moveDownLeft(panSpeed: number, tiltSpeed: number): Promise<PanevoResult<CommandResponse>> {
    return this.panTilt('move-down-left', 'left', 'down', panSpeed, tiltSpeed);
  }

  moveDownRight(panSpeed: number, tiltSpeed: number): Promise<PanevoResult<CommandResponse>> {
    return this.panTilt('move-down-right', 'right', 'down', panSpeed, tiltSpeed);
  }

  zoomIn(speed: number): Promise<PanevoResult<CommandResponse>> {
    return this.sendCommand('zoom-in', buildZoomCommand('in', this.clampZoomSpeed(speed)));
  }

  zoomOut(speed: number): Promise<PanevoResult<CommandResponse>> {
    return this.sendCommand('zoom-out', buildZoomCommand('out', this.clampZoomSpeed(speed)));
  }

  stop(): Promise<PanevoResult<CommandResponse>> {
    return this.sendCommand('stop', buildStopCommand(), { flushPending: true });
  }

  zoomStop(): Promise<PanevoResult<CommandResponse>> {
    return this.sendCommand('zoom-stop', buildZoomStopCommand(), { flushPending: true });
  }

  recallPreset(presetNumber: number): Promise<PanevoResult<CommandResponse>> {
    const preset = this.clampPresetNumber(presetNumber);
    return this.sendCommand(`recall-preset-${preset}`, buildRecallPresetCommand(preset));
  }

  storePreset(presetNumber: number): Promise<PanevoResult<CommandResponse>> {
    const preset = this.clampPresetNumber(presetNumber);
    return this.sendCommand(`store-preset-${preset}`, buildStorePresetCommand(preset));
  }

  private panTilt(
    name: string,
    panDirection: PanDirection,
    tiltDirection: TiltDirection,
    panSpeed: number,
    tiltSpeed: number,
  ): Promise<PanevoResult<CommandResponse>> {
    return this.sendCommand(
      name,
      buildPanTiltCommand(panDirection, tiltDirection, this.clampPanSpeed(panSpeed), this.clampTiltSpeed(tiltSpeed)),
    );
  }

  private sendCommand(
    name: string,
    packet: Buffer,
    options: { flushPending?: boolean } = {},
  ): Promise<PanevoResult<CommandResponse>> {
    if (!this.config || !this.connected) {
      return Promise.resolve(failure('NOT_CONNECTED', 'Camera is not connected.'));
    }

    return this.queue.enqueue(
      name,
      async () => {
        if (!this.config) {
          throw new Error('Missing VISCA config');
        }

        if (this.config.mockMode) {
          console.info(`[visca:mock] ${name}`, packet.toString('hex').match(/.{1,2}/g)?.join(' '));
          return this.commandResponse(name);
        }

        if (!this.socket) {
          throw new Error('Missing UDP socket');
        }

        await new Promise<void>((resolve, reject) => {
          this.socket?.send(packet, this.config?.port, this.config?.ipAddress, (error) => {
            if (error) {
              reject(error);
              return;
            }
            resolve();
          });
        });

        return this.commandResponse(name);
      },
      options,
    );
  }

  private commandResponse(command: string): CommandResponse {
    return {
      command,
      queuedAt: new Date().toISOString(),
    };
  }

  private validateConfig(config: CameraConfig): PanevoResult<CameraConfig> {
    const roundedPort = Math.round(config.port);
    const normalized: CameraConfig = {
      ipAddress: config.ipAddress.trim(),
      port: Number.isFinite(roundedPort) ? Math.min(65535, Math.max(1, roundedPort)) : 52381,
      protocol: config.protocol === 'tcp' ? 'tcp' : 'udp',
      mockMode: Boolean(config.mockMode),
      presets: config.presets,
    };

    if (!normalized.mockMode && normalized.ipAddress.length === 0) {
      return failure('INVALID_CONFIG', 'Camera IP address is required when mock mode is disabled.');
    }

    return success(normalized);
  }

  private clampPanSpeed(speed: number): number {
    return clampInteger(speed, 1, 24);
  }

  private clampTiltSpeed(speed: number): number {
    return clampInteger(speed, 1, 24);
  }

  private clampZoomSpeed(speed: number): number {
    return clampInteger(speed, 1, 8);
  }

  private clampPresetNumber(presetNumber: number): number {
    return clampInteger(presetNumber, 1, 255);
  }

  private disconnectSocket(): void {
    if (!this.socket) {
      return;
    }

    this.socket.close();
    this.socket = null;
  }
}
