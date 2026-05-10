import { app } from 'electron';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { CameraConfig, CameraPreset, PanevoResult } from '../../../shared/types';

const DEFAULT_CONFIG: CameraConfig = {
  ipAddress: '',
  port: 52381,
  protocol: 'udp',
  mockMode: true,
  presets: [],
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

    if (!normalized.mockMode && normalized.ipAddress.length === 0) {
      return failure('INVALID_CONFIG', 'Camera IP address is required when mock mode is disabled.');
    }

    try {
      await mkdir(dirname(this.configPath), { recursive: true });
      await writeFile(this.configPath, `${JSON.stringify(normalized, null, 2)}\n`, 'utf8');
      return success(normalized);
    } catch (error) {
      console.error('[config] Failed to save config', error);
      return failure('CONFIG_WRITE_FAILED', 'Unable to save local Panevo configuration.');
    }
  }

  private normalizeConfig(config: Partial<CameraConfig>): CameraConfig {
    return {
      ipAddress: typeof config.ipAddress === 'string' ? config.ipAddress.trim() : DEFAULT_CONFIG.ipAddress,
      port: this.clampPort(config.port),
      protocol: config.protocol === 'tcp' ? 'tcp' : 'udp',
      mockMode: typeof config.mockMode === 'boolean' ? config.mockMode : DEFAULT_CONFIG.mockMode,
      presets: this.normalizePresets(config),
    };
  }

  private clampPort(port: unknown): number {
    if (typeof port !== 'number' || Number.isNaN(port)) {
      return DEFAULT_CONFIG.port;
    }
    return Math.min(65535, Math.max(1, Math.round(port)));
  }

  private normalizePresets(config: Partial<CameraConfig> & { presetLabels?: unknown }): CameraPreset[] {
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
