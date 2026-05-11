import { app } from 'electron';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { CameraConfig, CameraPreset, CameraProfile, PanevoResult } from '../../../shared/types';

const DEFAULT_CAMERA: CameraProfile = {
  id: 'camera-default',
  label: 'Camera 1',
  ipAddress: '',
  port: 52381,
  onvifPort: 8080,
  onvifUsername: '',
  onvifPassword: '',
  controlProtocol: 'visca',
  syncProtocol: 'onvif',
  protocol: 'udp',
  healthCheckMode: 'visca-inquiry',
  presets: [],
};

const DEFAULT_CONFIG: CameraConfig = {
  activeCameraId: DEFAULT_CAMERA.id,
  cameras: [DEFAULT_CAMERA],
};

const success = <T>(data: T): PanevoResult<T> => ({ ok: true, data });

const failure = <T = never>(code: string, message: string): PanevoResult<T> => ({
  ok: false,
  error: { code, message },
});

export class ConfigService {
  private readonly configPath: string;

  constructor(configPath = join(app.getPath('userData'), 'panevo-config.json')) {
    this.configPath = configPath;
  }

  async getConfig(): Promise<PanevoResult<CameraConfig>> {
    try {
      const raw = await readFile(this.configPath, 'utf8');
      const parsed = JSON.parse(raw) as Partial<CameraConfig>;
      return success(this.normalizeConfig(parsed));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return success(DEFAULT_CONFIG);
      }

      console.error('[config] Failed to read config', error);
      return failure('CONFIG_READ_FAILED', 'Unable to read local Panevo configuration.');
    }
  }

  async saveConfig(config: CameraConfig): Promise<PanevoResult<CameraConfig>> {
    const normalized = this.normalizeConfig(config);

    try {
      await mkdir(dirname(this.configPath), { recursive: true });
      await writeFile(this.configPath, `${JSON.stringify(normalized, null, 2)}\n`, 'utf8');
      return success(normalized);
    } catch (error) {
      console.error('[config] Failed to save config', error);
      return failure('CONFIG_WRITE_FAILED', 'Unable to save local Panevo configuration.');
    }
  }

  async importConfig(sourcePath: string): Promise<PanevoResult<CameraConfig>> {
    try {
      const raw = await readFile(sourcePath, 'utf8');
      const parsed = JSON.parse(raw) as Partial<CameraConfig>;
      return this.saveConfig(this.normalizeConfig(parsed));
    } catch (error) {
      console.error('[config] Failed to import config', error);
      return failure('CONFIG_IMPORT_FAILED', 'Unable to import Panevo configuration.');
    }
  }

  async exportConfig(destinationPath: string): Promise<PanevoResult<{ path: string }>> {
    const configResult = await this.getConfig();
    if (!configResult.ok) {
      return configResult;
    }

    try {
      await mkdir(dirname(destinationPath), { recursive: true });
      await writeFile(destinationPath, `${JSON.stringify(configResult.data, null, 2)}\n`, 'utf8');
      return success({ path: destinationPath });
    } catch (error) {
      console.error('[config] Failed to export config', error);
      return failure('CONFIG_EXPORT_FAILED', 'Unable to export Panevo configuration.');
    }
  }

  getActiveCamera(config: CameraConfig): CameraProfile | null {
    return config.cameras.find((camera) => camera.id === config.activeCameraId) ?? config.cameras[0] ?? null;
  }

  async getActiveCameraConfig(): Promise<PanevoResult<CameraProfile>> {
    const configResult = await this.getConfig();
    if (!configResult.ok) {
      return configResult;
    }

    const activeCamera = this.getActiveCamera(configResult.data);
    if (!activeCamera) {
      return failure('NO_ACTIVE_CAMERA', 'No camera profile is configured.');
    }

    return success(activeCamera);
  }

  private normalizeConfig(config: Partial<CameraConfig> & Partial<CameraProfile> & { presetLabels?: unknown }): CameraConfig {
    const cameras = this.normalizeCameras(config);
    const requestedActiveCameraId = typeof config.activeCameraId === 'string' ? config.activeCameraId.trim() : '';
    const activeCamera = cameras.find((camera) => camera.id === requestedActiveCameraId) ?? cameras[0] ?? null;

    return {
      activeCameraId: activeCamera?.id ?? '',
      cameras,
    };
  }

  private normalizeCameras(config: Partial<CameraConfig> & Partial<CameraProfile> & { presetLabels?: unknown }): CameraProfile[] {
    if (Array.isArray(config.cameras)) {
      return config.cameras
        .map((camera, index) => this.normalizeCamera(camera, index + 1))
        .filter((camera): camera is CameraProfile => Boolean(camera));
    }

    const migratedCamera = this.normalizeCamera(config, 1);
    return migratedCamera ? [migratedCamera] : [];
  }

  private normalizeCamera(camera: Partial<CameraProfile> & { presetLabels?: unknown }, fallbackNumber: number): CameraProfile | null {
    if (!camera || typeof camera !== 'object') {
      return null;
    }

    const fallbackId = fallbackNumber === 1 ? DEFAULT_CAMERA.id : `camera-${fallbackNumber}`;
    const id = typeof camera.id === 'string' && camera.id.trim().length > 0 ? camera.id.trim().slice(0, 64) : fallbackId;
    const label = typeof camera.label === 'string' && camera.label.trim().length > 0 ? camera.label.trim().slice(0, 40) : `Camera ${fallbackNumber}`;
    return {
      id,
      label,
      ipAddress: typeof camera.ipAddress === 'string' ? camera.ipAddress.trim() : DEFAULT_CAMERA.ipAddress,
      port: this.clampPort(camera.port),
      onvifPort: this.clampPort(camera.onvifPort, DEFAULT_CAMERA.onvifPort),
      onvifUsername: typeof camera.onvifUsername === 'string' ? camera.onvifUsername.trim().slice(0, 80) : '',
      onvifPassword: typeof camera.onvifPassword === 'string' ? camera.onvifPassword : '',
      controlProtocol: camera.controlProtocol === 'onvif' ? 'onvif' : 'visca',
      syncProtocol: camera.syncProtocol === 'none' ? 'none' : 'onvif',
      protocol: camera.protocol === 'tcp' ? 'tcp' : 'udp',
      healthCheckMode: camera.healthCheckMode === 'transport-only' ? 'transport-only' : 'visca-inquiry',
      presets: this.normalizePresets(camera),
    };
  }

  private clampPort(port: unknown, fallback = DEFAULT_CAMERA.port): number {
    if (typeof port !== 'number' || Number.isNaN(port)) {
      return fallback;
    }
    return Math.min(65535, Math.max(1, Math.round(port)));
  }

  private normalizePresets(config: Partial<CameraProfile> & { presetLabels?: unknown }): CameraPreset[] {
    if (Array.isArray(config.presets)) {
      const normalized = config.presets
        .map((preset, index) => this.normalizePreset(preset, index + 1))
        .filter((preset): preset is CameraPreset => Boolean(preset));

      return normalized;
    }

    if (config.presetLabels && typeof config.presetLabels === 'object') {
      const labels = config.presetLabels as Record<string, unknown>;
      return Object.keys(labels)
        .map((key) => Number(key))
        .filter((presetNumber) => Number.isFinite(presetNumber))
        .sort((a, b) => a - b)
        .map((presetNumber) => ({
          id: `preset-${presetNumber}`,
          label: typeof labels[String(presetNumber)] === 'string' ? String(labels[String(presetNumber)]).trim().slice(0, 32) : `Preset ${presetNumber}`,
          cameraPreset: this.clampPresetNumber(presetNumber),
        }));
    }

    return [];
  }

  private normalizePreset(preset: Partial<CameraPreset>, fallbackNumber: number): CameraPreset | null {
    if (!preset || typeof preset !== 'object') {
      return null;
    }

    const cameraPreset = this.clampPresetNumber(preset.cameraPreset ?? fallbackNumber);
    const label = typeof preset.label === 'string' ? preset.label.trim().slice(0, 32) : '';
    const id = typeof preset.id === 'string' && preset.id.trim().length > 0 ? preset.id.trim().slice(0, 64) : `preset-${cameraPreset}`;

    return {
      id,
      label: label || `Preset ${cameraPreset}`,
      cameraPreset,
    };
  }

  private clampPresetNumber(presetNumber: unknown): number {
    if (typeof presetNumber !== 'number' || Number.isNaN(presetNumber)) {
      return 1;
    }

    return Math.min(255, Math.max(1, Math.round(presetNumber)));
  }
}
