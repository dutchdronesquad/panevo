import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppSidebar, type AppView } from './components/shell/AppSidebar';
import { WorkspaceHeader } from './components/shell/WorkspaceHeader';
import { TooltipProvider } from '@/renderer/components/ui/tooltip';
import { MainLayout } from './layouts/MainLayout';
import { CamerasView } from './views/CamerasView';
import { ControlView } from './views/ControlView';
import { SettingsView, type Theme } from './views/SettingsView';
import type { CameraConfig, CameraConnectionStatus, CameraPreset, CameraProfile, CommandResponse, FocusMode, PanevoResult } from './types/camera';

const fallbackCamera: CameraProfile = {
  id: 'camera-default',
  label: 'Camera 1',
  ipAddress: '',
  port: 52381,
  protocol: 'udp',
  healthCheckMode: 'visca-inquiry',
  presets: [],
};

const fallbackConfig: CameraConfig = {
  activeCameraId: fallbackCamera.id,
  cameras: [fallbackCamera],
};

const HEALTH_CHECK_INTERVAL_MS = 15_000;

const getActiveCamera = (config: CameraConfig): CameraProfile => {
  return config.cameras.find((camera) => camera.id === config.activeCameraId) ?? config.cameras[0] ?? fallbackCamera;
};

const updateActiveCamera = (config: CameraConfig, camera: CameraProfile): CameraConfig => ({
  ...config,
  activeCameraId: camera.id,
  cameras: config.cameras.map((item) => (item.id === camera.id ? camera : item)),
});

const updateCameraProfile = (config: CameraConfig, camera: CameraProfile): CameraConfig => ({
  ...config,
  cameras: config.cameras.map((item) => (item.id === camera.id ? camera : item)),
});

export const App = () => {
  const [config, setConfig] = useState<CameraConfig>(fallbackConfig);
  const [status, setStatus] = useState<CameraConnectionStatus>({
    connected: false,
    protocol: 'udp',
    message: 'Disconnected',
  });
  const [speed, setSpeed] = useState(10);
  const [zoomSpeed, setZoomSpeed] = useState(5);
  const [focusMode, setFocusMode] = useState<FocusMode>('auto');
  const [, setLastCommand] = useState<CommandResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<AppView>('control');
  const activeCamera = useMemo(() => getActiveCamera(config), [config]);

  const saveConfigState = useCallback(async (nextConfig: CameraConfig) => {
    setConfig(nextConfig);
    const result = await window.panevo.saveConfig(nextConfig);
    if (!result.ok) {
      setError(`${result.error.code}: ${result.error.message}`);
      return;
    }

    setConfig(result.data);
    setError(null);
  }, []);

  useEffect(() => {
    void (async () => {
      const configResult = await window.panevo.getConfig();
      if (!configResult.ok) {
        setError(configResult.error.message);
        return;
      }
      const camera = getActiveCamera(configResult.data);
      setConfig(configResult.data);

      // Query real connection state from main process — survives renderer hot reload
      const statusResult = await window.panevo.testConnection();
      setStatus(
        statusResult.ok
          ? statusResult.data
          : { connected: false, protocol: camera.protocol, message: 'Disconnected' },
      );
    })();
  }, []);

  useEffect(() => {
    if (!activeCamera.ipAddress) {
      setStatus({
        connected: false,
        protocol: activeCamera.protocol,
        message: 'Disconnected',
      });
      return;
    }

    let cancelled = false;

    const checkHealth = async () => {
      const result = await window.panevo.checkCameraHealth();
      if (cancelled) {
        return;
      }

      if (result.ok) {
        setStatus(result.data);
        setError(null);
        return;
      }

      setStatus({
        connected: false,
        protocol: activeCamera.protocol,
        message: 'Health check failed',
        checkedAt: new Date().toISOString(),
        responseVerified: false,
      });
      setError(`${result.error.code}: ${result.error.message}`);
    };

    void checkHealth();
    const interval = window.setInterval(() => {
      void checkHealth();
    }, HEALTH_CHECK_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [activeCamera.id, activeCamera.ipAddress, activeCamera.port, activeCamera.protocol]);

  const saveCameraProfile = useCallback((camera: CameraProfile) => {
    void saveConfigState(updateCameraProfile(config, camera));

    if (camera.id === config.activeCameraId) {
      setStatus({
        connected: false,
        protocol: camera.protocol,
        message: 'Disconnected',
      });
    }
  }, [config, saveConfigState]);

  const testCamera = useCallback(async (cameraId: string) => {
    const camera = config.cameras.find((item) => item.id === cameraId);
    if (!camera) {
      return;
    }

    const nextConfig = { ...config, activeCameraId: cameraId };
    const saveResult = await window.panevo.saveConfig(nextConfig);
    if (!saveResult.ok) {
      setError(`${saveResult.error.code}: ${saveResult.error.message}`);
      return;
    }

    setConfig(saveResult.data);
    setStatus({
      connected: false,
      protocol: camera.protocol,
      message: 'Connecting...',
    });

    const result = await window.panevo.testConnection();
    if (result.ok) {
      setStatus(result.data);
      setError(null);
      return;
    }

    setStatus({
      connected: false,
      protocol: camera.protocol,
      message: 'Disconnected',
    });
    setError(`${result.error.code}: ${result.error.message}`);
  }, [config]);

  const selectCamera = useCallback(async (cameraId: string) => {
    const nextCamera = config.cameras.find((camera) => camera.id === cameraId);
    if (!nextCamera || nextCamera.id === config.activeCameraId) {
      return;
    }

    const nextConfig = { ...config, activeCameraId: cameraId };
    const saveResult = await window.panevo.saveConfig(nextConfig);
    if (!saveResult.ok) {
      setError(`${saveResult.error.code}: ${saveResult.error.message}`);
      return;
    }

    setConfig(saveResult.data);
    setStatus({
      connected: false,
      protocol: nextCamera.protocol,
      message: 'Checking camera...',
      checkedAt: new Date().toISOString(),
      responseVerified: false,
    });

    const healthResult = await window.panevo.checkCameraHealth();
    if (healthResult.ok) {
      setStatus(healthResult.data);
      setError(null);
      return;
    }

    setStatus({
      connected: false,
      protocol: nextCamera.protocol,
      message: 'Health check failed',
      checkedAt: new Date().toISOString(),
      responseVerified: false,
    });
    setError(`${healthResult.error.code}: ${healthResult.error.message}`);
  }, [config]);

  const handleResult = useCallback(async (operation: Promise<PanevoResult<CommandResponse>>) => {
    try {
      const result = await operation;
      if (result.ok) {
        setLastCommand(result.data);
        setError(null);
        return;
      }

      setError(`${result.error.code}: ${result.error.message}`);
    } catch (unknownError) {
      const message = unknownError instanceof Error ? unknownError.message : 'Unknown IPC error';
      setError(`IPC_ERROR: ${message}`);
    }
  }, []);

  const stopAll = useCallback(() => {
    void handleResult(window.panevo.stop());
    void handleResult(window.panevo.zoomStop());
    void handleResult(window.panevo.focusStop());
  }, [handleResult]);

  useEffect(() => {
    const stopOnVisibilityLoss = () => {
      if (document.hidden) {
        stopAll();
      }
    };

    window.addEventListener('blur', stopAll);
    document.addEventListener('visibilitychange', stopOnVisibilityLoss);

    return () => {
      window.removeEventListener('blur', stopAll);
      document.removeEventListener('visibilitychange', stopOnVisibilityLoss);
    };
  }, [stopAll]);

  const actions = useMemo(
    () => ({
      panLeft: () => handleResult(window.panevo.panLeft(speed)),
      panRight: () => handleResult(window.panevo.panRight(speed)),
      tiltUp: () => handleResult(window.panevo.tiltUp(speed)),
      tiltDown: () => handleResult(window.panevo.tiltDown(speed)),
      moveUpLeft: () => handleResult(window.panevo.moveUpLeft(speed, speed)),
      moveUpRight: () => handleResult(window.panevo.moveUpRight(speed, speed)),
      moveDownLeft: () => handleResult(window.panevo.moveDownLeft(speed, speed)),
      moveDownRight: () => handleResult(window.panevo.moveDownRight(speed, speed)),
      stop: () => handleResult(window.panevo.stop()),
      zoomIn: () => handleResult(window.panevo.zoomIn(zoomSpeed)),
      zoomOut: () => handleResult(window.panevo.zoomOut(zoomSpeed)),
      zoomStop: () => handleResult(window.panevo.zoomStop()),
      setFocusMode: (mode: FocusMode) => {
        void (async () => {
          const result = await window.panevo.setFocusMode(mode);
          if (result.ok) {
            setFocusMode(mode);
            setLastCommand(result.data);
            setError(null);
            return;
          }

          setError(`${result.error.code}: ${result.error.message}`);
        })();
      },
      focusIn: () => handleResult(window.panevo.focusIn(4)),
      focusOut: () => handleResult(window.panevo.focusOut(4)),
      focusStop: () => handleResult(window.panevo.focusStop()),
      stopAll,
      recallPreset: (preset: number) => handleResult(window.panevo.recallPreset(preset)),
      storePreset: (preset: number) => handleResult(window.panevo.storePreset(preset)),
      addPreset: () => {
        if (activeCamera.presets.length >= 9) return;
        const usedNumbers = new Set(activeCamera.presets.map((preset) => preset.cameraPreset));
        let cameraPreset = 1;
        while (usedNumbers.has(cameraPreset) && cameraPreset <= 9) {
          cameraPreset += 1;
        }

        const nextPreset: CameraPreset = {
          id: `preset-${Date.now()}`,
          label: `Preset ${cameraPreset}`,
          cameraPreset,
        };

        void saveConfigState(updateActiveCamera(config, { ...activeCamera, presets: [...activeCamera.presets, nextPreset] }));
      },
      updatePreset: (id: string, updates: Partial<Pick<CameraPreset, 'label' | 'cameraPreset'>>) => {
        void saveConfigState(
          updateActiveCamera(config, {
            ...activeCamera,
            presets: activeCamera.presets.map((preset) =>
            preset.id === id
              ? {
                  ...preset,
                  ...updates,
                  label: updates.label !== undefined ? updates.label.trim().slice(0, 32) || `Preset ${preset.cameraPreset}` : preset.label,
                  cameraPreset:
                    updates.cameraPreset !== undefined ? Math.min(255, Math.max(1, Math.round(updates.cameraPreset))) : preset.cameraPreset,
                }
              : preset,
            ),
          }),
        );
      },
      deletePreset: (id: string) => {
        void saveConfigState(updateActiveCamera(config, { ...activeCamera, presets: activeCamera.presets.filter((preset) => preset.id !== id) }));
      },
    }),
    [activeCamera, config, handleResult, saveConfigState, speed, stopAll, zoomSpeed],
  );

  const cameraProfileActions = useMemo(
    () => ({
      selectCamera: (cameraId: string) => {
        void selectCamera(cameraId);
      },
      addCamera: async (camera: CameraProfile): Promise<{ ok: boolean; error?: string }> => {
        const nextCamera: CameraProfile = {
          ...camera,
          id: `camera-${Date.now()}`,
          presets: [],
        };

        setStatus({
          connected: false,
          protocol: nextCamera.protocol,
          message: 'Testing camera...',
        });

        const testResult = await window.panevo.testCameraConfig(nextCamera);
        if (!testResult.ok) {
          const active = getActiveCamera(config);
          setStatus({
            connected: false,
            protocol: active.protocol,
            message: 'Disconnected',
          });
          setError(`${testResult.error.code}: ${testResult.error.message}`);
          return {
            ok: false,
            error: `${testResult.error.code}: ${testResult.error.message}`,
          };
        }

        const nextConfig: CameraConfig = {
          activeCameraId: nextCamera.id,
          cameras: [...config.cameras, nextCamera],
        };

        const saveResult = await window.panevo.saveConfig(nextConfig);
        if (!saveResult.ok) {
          setError(`${saveResult.error.code}: ${saveResult.error.message}`);
          return {
            ok: false,
            error: `${saveResult.error.code}: ${saveResult.error.message}`,
          };
        }

        setConfig(saveResult.data);

        const reconnectResult = await window.panevo.testConnection();
        if (reconnectResult.ok) {
          setStatus(reconnectResult.data);
          setError(null);
          return { ok: true };
        }

        setStatus({
          connected: false,
          protocol: nextCamera.protocol,
          message: 'Disconnected',
        });
        setError(`${reconnectResult.error.code}: ${reconnectResult.error.message}`);
        return {
          ok: false,
          error: `${reconnectResult.error.code}: ${reconnectResult.error.message}`,
        };
      },
      renameCamera: (cameraId: string, label: string) => {
        void saveConfigState({
          ...config,
          cameras: config.cameras.map((camera) =>
            camera.id === cameraId
              ? {
                  ...camera,
                  label: label.trim().slice(0, 40) || camera.label,
                }
              : camera,
          ),
        });
      },
      deleteCamera: (cameraId: string) => {
        if (config.cameras.length <= 1) {
          return;
        }

        const nextCameras = config.cameras.filter((camera) => camera.id !== cameraId);
        void saveConfigState({
          activeCameraId: nextCameras[0].id,
          cameras: nextCameras,
        });
      },
      importConfig: async () => {
        const result = await window.panevo.importConfig();
        if (!result.ok) {
          if (result.error.code !== 'CONFIG_IMPORT_CANCELED') {
            setError(`${result.error.code}: ${result.error.message}`);
          }
          return;
        }

        const camera = getActiveCamera(result.data);
        setConfig(result.data);
        setStatus({
          connected: false,
          protocol: camera.protocol,
          message: 'Disconnected',
        });
        setError(null);
      },
      exportConfig: async () => {
        const result = await window.panevo.exportConfig();
        if (!result.ok) {
          if (result.error.code !== 'CONFIG_EXPORT_CANCELED') {
            setError(`${result.error.code}: ${result.error.message}`);
          }
          return;
        }

        setError(null);
      },
    }),
    [config, saveConfigState, selectCamera],
  );

  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('panevo-theme') as Theme | null) ?? 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('panevo-theme', theme);
  }, [theme]);

  const viewTitle = activeView === 'control' ? activeCamera.label : activeView === 'cameras' ? 'Camera Profiles' : 'Settings';

  return (
    <TooltipProvider>
      <MainLayout>
        <div className="app-frame">
          <AppSidebar
            activeView={activeView}
            activeCamera={activeCamera}
            status={status}
            error={error}
            onViewChange={setActiveView}
          />

          <div className="workspace">
            <WorkspaceHeader title={viewTitle} onEmergencyStop={stopAll} />

            {activeView === 'control' && (
              <ControlView
                activeCamera={activeCamera}
                actions={actions}
                speed={speed}
                zoomSpeed={zoomSpeed}
                focusMode={focusMode}
                onSpeedChange={setSpeed}
                onZoomSpeedChange={setZoomSpeed}
              />
            )}
            {activeView === 'cameras' && (
              <CamerasView
                config={config}
                activeCamera={activeCamera}
                cameraProfileActions={cameraProfileActions}
                onCameraSave={saveCameraProfile}
                onTestCamera={testCamera}
              />
            )}
            {activeView === 'settings' && (
              <SettingsView theme={theme} onThemeChange={setTheme} />
            )}
          </div>
        </div>
      </MainLayout>
    </TooltipProvider>
  );
};
