import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppSidebar, type AppView } from './components/shell/AppSidebar';
import { WorkspaceHeader } from './components/shell/WorkspaceHeader';
import { TooltipProvider } from '@/renderer/components/ui/tooltip';
import { MainLayout } from './layouts/MainLayout';
import { CamerasView } from './views/CamerasView';
import { ControlView } from './views/ControlView';
import { SettingsView, type Theme } from './views/SettingsView';
import type {
  CameraConfig,
  CameraConnectionStatus,
  CameraPreset,
  CameraProfile,
  CommandResponse,
  FocusMode,
  OnvifProbeState,
  OnvifProbeResult,
  PanevoResult,
} from './types/camera';

const fallbackCamera: CameraProfile = {
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

const fallbackConfig: CameraConfig = {
  activeCameraId: '',
  cameras: [],
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

const syncPresetEntriesFromOnvif = (camera: CameraProfile, result: OnvifProbeResult): CameraPreset[] => {
  const existingByNumber = new Map(camera.presets.map((preset) => [preset.cameraPreset, preset]));

  return result.presets
    .filter((preset) => preset.numericPreset !== undefined)
    .map((preset, index) => {
      const cameraPreset = preset.numericPreset as number;
      const existingPreset = existingByNumber.get(cameraPreset);

      return {
        id: existingPreset?.id ?? `preset-onvif-${camera.id}-${preset.token.replace(/[^a-z0-9-]/gi, '-')}-${Date.now()}-${index}`,
        label: (preset.name || `Preset ${cameraPreset}`).trim().slice(0, 32),
        cameraPreset,
      };
    })
    .sort((a, b) => a.cameraPreset - b.cameraPreset);
};

const syncCameraFromOnvifProbe = (camera: CameraProfile, result: OnvifProbeResult): CameraProfile => {
  return {
    ...camera,
    label: [result.device?.manufacturer, result.device?.model].filter(Boolean).join(' ').trim() || camera.label,
    presets: camera.syncProtocol === 'onvif' ? syncPresetEntriesFromOnvif(camera, result) : camera.presets,
  };
};

const presetsChanged = (current: CameraPreset[], next: CameraPreset[]): boolean => {
  if (current.length !== next.length) {
    return true;
  }

  return current.some((preset, index) => {
    const nextPreset = next[index];
    return !nextPreset || preset.label !== nextPreset.label || preset.cameraPreset !== nextPreset.cameraPreset;
  });
};

const shouldAutoProbeOnvif = (camera: CameraProfile): boolean => {
  return (
    camera.ipAddress.trim().length > 0 &&
    camera.syncProtocol === 'onvif'
  );
};

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
  const [onvifProbeStates, setOnvifProbeStates] = useState<Record<string, OnvifProbeState>>({});
  const activeCamera = useMemo(() => getActiveCamera(config), [config]);
  const hasActiveCamera = config.cameras.length > 0;

  const saveConfigState = useCallback(async (nextConfig: CameraConfig) => {
    setConfig(nextConfig);
    const result = await window.panevo.saveConfig(nextConfig);
    if (!result.ok) {
      setError(`${result.error.code}: ${result.error.message}`);
      return result;
    }

    setConfig(result.data);
    setError(null);
    return result;
  }, []);

  const probeOnvifCamera = useCallback(async (
    camera: CameraProfile,
    auth?: { username?: string; password?: string },
    options: { showError?: boolean } = {},
  ): Promise<{ ok: boolean; error?: string; result?: OnvifProbeResult }> => {
    if (camera.ipAddress.trim().length === 0) {
      const message = 'Camera IP address is required for ONVIF probing.';
      setOnvifProbeStates((current) => ({
        ...current,
        [camera.id]: {
          status: 'failed',
          checkedAt: new Date().toISOString(),
          error: message,
        },
      }));
      return { ok: false, error: message };
    }

    const result = await window.panevo.probeOnvifCamera({
      ipAddress: camera.ipAddress,
      port: camera.onvifPort,
      username: auth?.username?.trim() || camera.onvifUsername || undefined,
      password: auth?.password || camera.onvifPassword || undefined,
      timeoutMs: 5000,
    });

    if (!result.ok) {
      const message = `${result.error.code}: ${result.error.message}`;
      setOnvifProbeStates((current) => ({
        ...current,
        [camera.id]: {
          status: 'failed',
          checkedAt: new Date().toISOString(),
          error: message,
        },
      }));

      if (options.showError) {
        setError(message);
      }

      return { ok: false, error: message };
    }

    setOnvifProbeStates((current) => ({
      ...current,
      [camera.id]: {
        status: 'verified',
        checkedAt: result.data.checkedAt,
        result: result.data,
      },
    }));

    if (options.showError) {
      setError(null);
    }

    return { ok: true, result: result.data };
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

      if (configResult.data.cameras.length === 0) {
        setStatus({
          connected: false,
          protocol: 'udp',
          message: 'No camera configured',
        });
        return;
      }

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
    if (!hasActiveCamera) {
      setStatus({
        connected: false,
        protocol: 'udp',
        message: 'No camera configured',
      });
      return;
    }

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
  }, [
    activeCamera.controlProtocol,
    activeCamera.id,
    activeCamera.ipAddress,
    activeCamera.onvifPassword,
    activeCamera.onvifPort,
    activeCamera.onvifUsername,
    activeCamera.port,
    activeCamera.protocol,
    hasActiveCamera,
  ]);

  useEffect(() => {
    const candidates = config.cameras.filter((camera) => shouldAutoProbeOnvif(camera) && !onvifProbeStates[camera.id]);
    if (candidates.length === 0) {
      return;
    }

    let cancelled = false;
    const checkedAt = new Date().toISOString();

    setOnvifProbeStates((current) => {
      const next = { ...current };
      for (const camera of candidates) {
        next[camera.id] = {
          status: 'unknown',
          checkedAt,
        };
      }
      return next;
    });

    void (async () => {
      let workingConfig = config;
      for (const camera of candidates) {
        if (cancelled) {
          return;
        }

        const result = await probeOnvifCamera(camera);
        if (!result.ok || !result.result || camera.syncProtocol !== 'onvif') {
          continue;
        }

        const nextPresets = syncPresetEntriesFromOnvif(camera, result.result);
        if (presetsChanged(camera.presets, nextPresets)) {
          workingConfig = updateCameraProfile(workingConfig, { ...camera, presets: nextPresets });
          await saveConfigState(workingConfig);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [config, onvifProbeStates, probeOnvifCamera, saveConfigState]);

  const saveCameraProfile = useCallback((camera: CameraProfile) => {
    const previousCamera = config.cameras.find((item) => item.id === camera.id);
    const shouldClearOnvifState =
      previousCamera &&
      (previousCamera.ipAddress !== camera.ipAddress ||
        previousCamera.onvifPort !== camera.onvifPort ||
        previousCamera.onvifUsername !== camera.onvifUsername ||
        previousCamera.onvifPassword !== camera.onvifPassword ||
        previousCamera.syncProtocol !== camera.syncProtocol);

    if (shouldClearOnvifState) {
      setOnvifProbeStates((current) => {
        const next = { ...current };
        delete next[camera.id];
        return next;
      });
    }

    if (camera.id === config.activeCameraId) {
      setStatus({
        connected: false,
        protocol: camera.protocol,
        message: 'Disconnected',
      });
    }

    void (async () => {
      await saveConfigState(updateCameraProfile(config, camera));
    })();
  }, [config, probeOnvifCamera, saveConfigState]);

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
    if (!hasActiveCamera) {
      return;
    }

    void handleResult(window.panevo.stop());
    void handleResult(window.panevo.zoomStop());
    void handleResult(window.panevo.focusStop());
  }, [handleResult, hasActiveCamera]);

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
      storePreset: (preset: number, label?: string) => handleResult(window.panevo.storePreset(preset, label)),
      addPreset: () => {
        void (async () => {
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

          const storeResult = await window.panevo.storePreset(nextPreset.cameraPreset, nextPreset.label);
          if (!storeResult.ok) {
            setError(`${storeResult.error.code}: ${storeResult.error.message}`);
            return;
          }

          setLastCommand(storeResult.data);
          await saveConfigState(updateActiveCamera(config, { ...activeCamera, presets: [...activeCamera.presets, nextPreset] }));
        })();
      },
      updatePreset: (id: string, updates: Partial<Pick<CameraPreset, 'label' | 'cameraPreset'>>) => {
        void (async () => {
          const currentPreset = activeCamera.presets.find((preset) => preset.id === id);
          if (!currentPreset) return;

          const nextPreset: CameraPreset = {
            ...currentPreset,
            ...updates,
            label: updates.label !== undefined
              ? updates.label.trim().slice(0, 32) || `Preset ${currentPreset.cameraPreset}`
              : currentPreset.label,
            cameraPreset:
              updates.cameraPreset !== undefined ? Math.min(255, Math.max(1, Math.round(updates.cameraPreset))) : currentPreset.cameraPreset,
          };

          if (nextPreset.label !== currentPreset.label || nextPreset.cameraPreset !== currentPreset.cameraPreset) {
            const storeResult = await window.panevo.storePreset(nextPreset.cameraPreset, nextPreset.label);
            if (!storeResult.ok) {
              setError(`${storeResult.error.code}: ${storeResult.error.message}`);
              return;
            }

            setLastCommand(storeResult.data);
          }

          await saveConfigState(
            updateActiveCamera(config, {
              ...activeCamera,
              presets: activeCamera.presets.map((preset) => (preset.id === id ? nextPreset : preset)),
            }),
          );
        })();
      },
      deletePreset: (id: string) => {
        void (async () => {
          const preset = activeCamera.presets.find((item) => item.id === id);
          if (!preset) return;

          if (activeCamera.controlProtocol === 'visca' && activeCamera.syncProtocol !== 'onvif') {
            await saveConfigState(updateActiveCamera(config, { ...activeCamera, presets: activeCamera.presets.filter((item) => item.id !== id) }));
            return;
          }

          const removeResult = await window.panevo.removePreset(preset.cameraPreset);
          if (!removeResult.ok) {
            setError(`${removeResult.error.code}: ${removeResult.error.message}`);
            return;
          }

          setLastCommand(removeResult.data);
          await saveConfigState(updateActiveCamera(config, { ...activeCamera, presets: activeCamera.presets.filter((item) => item.id !== id) }));
        })();
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
        let nextCamera: CameraProfile = {
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

        if (nextCamera.syncProtocol === 'onvif') {
          const probeResult = await window.panevo.probeOnvifCamera({
            ipAddress: nextCamera.ipAddress,
            port: nextCamera.onvifPort,
            username: nextCamera.onvifUsername || undefined,
            password: nextCamera.onvifPassword || undefined,
            timeoutMs: 5000,
          });

          if (probeResult.ok) {
            nextCamera = syncCameraFromOnvifProbe(nextCamera, probeResult.data);

            setOnvifProbeStates((current) => ({
              ...current,
              [nextCamera.id]: {
                status: 'verified',
                checkedAt: probeResult.data.checkedAt,
                result: probeResult.data,
              },
            }));
          }
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
      probeOnvif: async (
        cameraId: string,
        auth?: { username?: string; password?: string },
      ): Promise<{ ok: boolean; error?: string; result?: OnvifProbeResult }> => {
        const camera = config.cameras.find((item) => item.id === cameraId);
        if (!camera) {
          return { ok: false, error: 'Camera profile not found.' };
        }

        const result = await probeOnvifCamera(camera, auth, { showError: true });
        if (result.ok && result.result) {
          const nextCamera = syncCameraFromOnvifProbe(camera, result.result);
          if (
            presetsChanged(camera.presets, nextCamera.presets) ||
            camera.label !== nextCamera.label
          ) {
            await saveConfigState(updateCameraProfile(config, nextCamera));
          }
        }

        return result;
      },
      importOnvifPresets: (cameraId: string, result: OnvifProbeResult) => {
        const camera = config.cameras.find((item) => item.id === cameraId);
        if (!camera) {
          setError('Camera profile not found.');
          return;
        }

        const importedPresets = syncPresetEntriesFromOnvif(camera, result);

        if (importedPresets.length === 0) {
          setError('No numeric ONVIF presets found to sync.');
          return;
        }

        void saveConfigState(
          updateCameraProfile(config, {
            ...camera,
            presets: importedPresets,
          }),
        );
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
        const nextCameras = config.cameras.filter((camera) => camera.id !== cameraId);
        const activeCameraRemoved = config.activeCameraId === cameraId;
        const nextActiveCameraId = activeCameraRemoved ? nextCameras[0]?.id ?? '' : config.activeCameraId;
        setOnvifProbeStates((current) => {
          const next = { ...current };
          delete next[cameraId];
          return next;
        });
        setStatus({
          connected: false,
          protocol: nextCameras[0]?.protocol ?? 'udp',
          message: nextCameras.length > 0 ? 'Disconnected' : 'No camera configured',
        });
        void saveConfigState({
          activeCameraId: nextActiveCameraId,
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
        setOnvifProbeStates({});
        setStatus({
          connected: false,
          protocol: result.data.cameras.length > 0 ? camera.protocol : 'udp',
          message: result.data.cameras.length > 0 ? 'Disconnected' : 'No camera configured',
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
    [config, probeOnvifCamera, saveConfigState, selectCamera],
  );

  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('panevo-theme') as Theme | null) ?? 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('panevo-theme', theme);
  }, [theme]);

  const viewTitle = activeView === 'control'
    ? hasActiveCamera ? activeCamera.label : 'Control'
    : activeView === 'cameras'
    ? 'Camera Profiles'
    : 'Settings';

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
            <WorkspaceHeader
              title={viewTitle}
              emergencyStopDisabled={!hasActiveCamera}
              onEmergencyStop={stopAll}
            />

            {activeView === 'control' && (
              <ControlView
                activeCamera={activeCamera}
                hasActiveCamera={hasActiveCamera}
                actions={actions}
                speed={speed}
                zoomSpeed={zoomSpeed}
                focusMode={focusMode}
                onSpeedChange={setSpeed}
                onZoomSpeedChange={setZoomSpeed}
                onOpenCameras={() => setActiveView('cameras')}
              />
            )}
            {activeView === 'cameras' && (
              <CamerasView
                config={config}
                activeCamera={activeCamera}
                onvifProbeStates={onvifProbeStates}
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
