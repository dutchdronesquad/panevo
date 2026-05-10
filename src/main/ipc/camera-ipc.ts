import { ipcMain } from 'electron';
import type { CameraConfig, CameraConnectionStatus, CommandResponse, PanevoResult } from '../../shared/types';
import { ConfigService } from '../services/config/config-service';
import { ViscaClient } from '../services/visca/visca-client';

const failure = <T = never>(code: string, message: string): PanevoResult<T> => ({
  ok: false,
  error: { code, message },
});

export const registerCameraIpc = (): void => {
  const configService = new ConfigService();
  const viscaClient = new ViscaClient();

  const withClient = async (
    command: () => Promise<PanevoResult<CommandResponse>>,
  ): Promise<PanevoResult<CommandResponse>> => {
    const configResult = await configService.getConfig();
    if (!configResult.ok) {
      return configResult;
    }

    const connectResult = await viscaClient.ensureConnected(configResult.data);
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
      const connectionChanged =
        previousConfig.ok &&
        saved.ok &&
        (previousConfig.data.ipAddress !== saved.data.ipAddress ||
          previousConfig.data.port !== saved.data.port ||
          previousConfig.data.protocol !== saved.data.protocol ||
          previousConfig.data.mockMode !== saved.data.mockMode);

      if (connectionChanged) {
        viscaClient.disconnect();
      }
      return saved;
    },
  );

  ipcMain.handle('panevo:test-connection', async (): Promise<PanevoResult<CameraConnectionStatus>> => {
    const configResult = await configService.getConfig();
    if (!configResult.ok) {
      return configResult;
    }
    return viscaClient.connect(configResult.data);
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
