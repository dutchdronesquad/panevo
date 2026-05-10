import { dialog, ipcMain } from 'electron';
import type { CameraConfig, CameraConnectionStatus, CameraProfile, CommandResponse, ConfigFileResponse, FocusMode, PanevoResult } from '../../shared/types';
import { ConfigService } from '../services/config/config-service';
import { ViscaClient } from '../services/visca/visca-client';

const failure = <T = never>(code: string, message: string): PanevoResult<T> => ({
  ok: false,
  error: { code, message },
});

const success = <T>(data: T): PanevoResult<T> => ({ ok: true, data });

const normalizeCameraInput = (camera: Partial<CameraProfile>): PanevoResult<CameraProfile> => {
  if (!camera || typeof camera !== 'object') {
    return failure('INVALID_CONFIG', 'Camera configuration is required.');
  }

  const ipAddress = typeof camera.ipAddress === 'string' ? camera.ipAddress.trim() : '';
  if (ipAddress.length === 0) {
    return failure('INVALID_CONFIG', 'Camera IP address is required.');
  }

  const port = typeof camera.port === 'number' && Number.isFinite(camera.port)
    ? Math.min(65535, Math.max(1, Math.round(camera.port)))
    : 52381;

  return success({
    id: typeof camera.id === 'string' && camera.id.trim().length > 0 ? camera.id.trim().slice(0, 64) : `camera-${Date.now()}`,
    label: typeof camera.label === 'string' && camera.label.trim().length > 0 ? camera.label.trim().slice(0, 40) : 'Camera',
    ipAddress,
    port,
    protocol: camera.protocol === 'tcp' ? 'tcp' : 'udp',
    healthCheckMode: camera.healthCheckMode === 'transport-only' ? 'transport-only' : 'visca-inquiry',
    presets: Array.isArray(camera.presets) ? camera.presets : [],
  });
};

export const registerCameraIpc = (): void => {
  const configService = new ConfigService();
  const viscaClient = new ViscaClient();

  const withClient = async (
    command: () => Promise<PanevoResult<CommandResponse>>,
  ): Promise<PanevoResult<CommandResponse>> => {
    const cameraResult = await configService.getActiveCameraConfig();
    if (!cameraResult.ok) {
      return cameraResult;
    }

    const connectResult = await viscaClient.ensureConnected(cameraResult.data);
    if (!connectResult.ok) {
      return failure(connectResult.error.code, connectResult.error.message);
    }

    return command();
  };

  ipcMain.handle('panevo:get-config', async (): Promise<PanevoResult<CameraConfig>> => {
    return configService.getConfig();
  });

  ipcMain.handle(
    'panevo:save-config',
    async (_event, config: CameraConfig): Promise<PanevoResult<CameraConfig>> => {
      const previousConfig = await configService.getConfig();
      const saved = await configService.saveConfig(config);
      const previousCamera = previousConfig.ok ? configService.getActiveCamera(previousConfig.data) : null;
      const savedCamera = saved.ok ? configService.getActiveCamera(saved.data) : null;
      const connectionChanged =
        Boolean(previousCamera) &&
        Boolean(savedCamera) &&
        (previousCamera?.id !== savedCamera?.id ||
          previousCamera?.ipAddress !== savedCamera?.ipAddress ||
          previousCamera?.port !== savedCamera?.port ||
          previousCamera?.protocol !== savedCamera?.protocol);

      if (connectionChanged) {
        viscaClient.disconnect();
      }
      return saved;
    },
  );

  ipcMain.handle('panevo:import-config', async (): Promise<PanevoResult<CameraConfig>> => {
    const result = await dialog.showOpenDialog({
      title: 'Import Panevo Configuration',
      filters: [{ name: 'Panevo configuration', extensions: ['json'] }],
      properties: ['openFile'],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return failure('CONFIG_IMPORT_CANCELED', 'Config import canceled.');
    }

    viscaClient.disconnect();
    return configService.importConfig(result.filePaths[0]);
  });

  ipcMain.handle('panevo:export-config', async (): Promise<PanevoResult<ConfigFileResponse>> => {
    const result = await dialog.showSaveDialog({
      title: 'Export Panevo Configuration',
      defaultPath: 'panevo-config.json',
      filters: [{ name: 'Panevo configuration', extensions: ['json'] }],
    });

    if (result.canceled || !result.filePath) {
      return failure('CONFIG_EXPORT_CANCELED', 'Config export canceled.');
    }

    return configService.exportConfig(result.filePath);
  });

  ipcMain.handle('panevo:test-connection', async (): Promise<PanevoResult<CameraConnectionStatus>> => {
    const cameraResult = await configService.getActiveCameraConfig();
    if (!cameraResult.ok) {
      return cameraResult;
    }
    return viscaClient.healthCheck(cameraResult.data);
  });

  ipcMain.handle(
    'panevo:test-camera-config',
    async (_event, camera: Partial<CameraProfile>): Promise<PanevoResult<CameraConnectionStatus>> => {
      const cameraResult = normalizeCameraInput(camera);
      if (!cameraResult.ok) {
        return cameraResult;
      }

      return viscaClient.healthCheck(cameraResult.data);
    },
  );

  ipcMain.handle('panevo:check-camera-health', async (): Promise<PanevoResult<CameraConnectionStatus>> => {
    const cameraResult = await configService.getActiveCameraConfig();
    if (!cameraResult.ok) {
      return cameraResult;
    }

    return viscaClient.healthCheck(cameraResult.data);
  });

  ipcMain.handle('panevo:pan-left', async (_event, speed: number) => withClient(() => viscaClient.panLeft(speed)));
  ipcMain.handle('panevo:pan-right', async (_event, speed: number) => withClient(() => viscaClient.panRight(speed)));
  ipcMain.handle('panevo:tilt-up', async (_event, speed: number) => withClient(() => viscaClient.tiltUp(speed)));
  ipcMain.handle('panevo:tilt-down', async (_event, speed: number) => withClient(() => viscaClient.tiltDown(speed)));
  ipcMain.handle('panevo:move-up-left', async (_event, panSpeed: number, tiltSpeed: number) =>
    withClient(() => viscaClient.moveUpLeft(panSpeed, tiltSpeed)),
  );
  ipcMain.handle('panevo:move-up-right', async (_event, panSpeed: number, tiltSpeed: number) =>
    withClient(() => viscaClient.moveUpRight(panSpeed, tiltSpeed)),
  );
  ipcMain.handle('panevo:move-down-left', async (_event, panSpeed: number, tiltSpeed: number) =>
    withClient(() => viscaClient.moveDownLeft(panSpeed, tiltSpeed)),
  );
  ipcMain.handle('panevo:move-down-right', async (_event, panSpeed: number, tiltSpeed: number) =>
    withClient(() => viscaClient.moveDownRight(panSpeed, tiltSpeed)),
  );
  ipcMain.handle('panevo:zoom-in', async (_event, speed: number) => withClient(() => viscaClient.zoomIn(speed)));
  ipcMain.handle('panevo:zoom-out', async (_event, speed: number) => withClient(() => viscaClient.zoomOut(speed)));
  ipcMain.handle('panevo:stop', async () => withClient(() => viscaClient.stop()));
  ipcMain.handle('panevo:zoom-stop', async () => withClient(() => viscaClient.zoomStop()));
  ipcMain.handle('panevo:set-focus-mode', async (_event, mode: FocusMode) => withClient(() => viscaClient.setFocusMode(mode)));
  ipcMain.handle('panevo:focus-in', async (_event, speed: number) => withClient(() => viscaClient.focusIn(speed)));
  ipcMain.handle('panevo:focus-out', async (_event, speed: number) => withClient(() => viscaClient.focusOut(speed)));
  ipcMain.handle('panevo:focus-stop', async () => withClient(() => viscaClient.focusStop()));
  ipcMain.handle('panevo:recall-preset', async (_event, presetNumber: number) =>
    withClient(() => viscaClient.recallPreset(presetNumber)),
  );
  ipcMain.handle('panevo:store-preset', async (_event, presetNumber: number) =>
    withClient(() => viscaClient.storePreset(presetNumber)),
  );

  process.on('exit', () => {
    viscaClient.disconnect();
  });
};
