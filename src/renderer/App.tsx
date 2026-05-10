import { useCallback, useEffect, useMemo, useState } from 'react';
import { OctagonX, Radio, RadioReceiver, Zap } from 'lucide-react';
import { CameraSettings } from './components/camera/CameraSettings';
import { ConnectionStatus } from './components/camera/ConnectionStatus';
import { PtzControls } from './components/controls/PtzControls';
import { SpeedSelector } from './components/controls/SpeedSelector';
import { ZoomControls } from './components/controls/ZoomControls';
import { PresetGrid } from './components/presets/PresetGrid';
import { Button } from './components/ui/Button';
import { MainLayout } from './layouts/MainLayout';
import type { CameraConfig, CameraConnectionStatus, CameraPreset, CommandResponse, PanevoResult } from './types/camera';

const fallbackConfig: CameraConfig = {
  ipAddress: '',
  port: 52381,
  protocol: 'udp',
  mockMode: true,
  presets: [],
};

export const App = () => {
  const [config, setConfig] = useState<CameraConfig>(fallbackConfig);
  const [status, setStatus] = useState<CameraConnectionStatus>({
    connected: false,
    mockMode: true,
    protocol: 'udp',
    message: 'Mock mode ready',
  });
  const [speed, setSpeed] = useState(10);
  const [zoomSpeed, setZoomSpeed] = useState(5);
  const [lastCommand, setLastCommand] = useState<CommandResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    void window.panevo.getConfig().then((result) => {
      if (result.ok) {
        setConfig(result.data);
        setStatus((current) => ({
          ...current,
          mockMode: result.data.mockMode,
          protocol: result.data.protocol,
          message: result.data.mockMode ? 'Mock mode ready' : 'Disconnected',
        }));
        return;
      }
      setError(result.error.message);
    });
  }, []);

  const handleResult = useCallback(async (operation: Promise<PanevoResult<CommandResponse>>) => {
    const result = await operation;
    if (result.ok) {
      setLastCommand(result.data);
      setError(null);
    } else {
      setError(`${result.error.code}: ${result.error.message}`);
    }
  }, []);

  const stopAll = useCallback(() => {
    void handleResult(window.panevo.stop());
    void handleResult(window.panevo.zoomStop());
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
      stopAll,
      recallPreset: (preset: number) => handleResult(window.panevo.recallPreset(preset)),
      storePreset: (preset: number) => handleResult(window.panevo.storePreset(preset)),
      addPreset: () => {
        const usedNumbers = new Set(config.presets.map((preset) => preset.cameraPreset));
        let cameraPreset = 1;
        while (usedNumbers.has(cameraPreset)) {
          cameraPreset += 1;
        }

        const nextPreset: CameraPreset = {
          id: `preset-${Date.now()}`,
          label: `Preset ${cameraPreset}`,
          cameraPreset,
        };

        void saveConfigState({
          ...config,
          presets: [...config.presets, nextPreset],
        });
      },
      updatePreset: (id: string, updates: Partial<Pick<CameraPreset, 'label' | 'cameraPreset'>>) => {
        const nextConfig: CameraConfig = {
          ...config,
          presets: config.presets.map((preset) =>
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
        };
        void saveConfigState(nextConfig);
      },
      deletePreset: (id: string) => {
        void saveConfigState({
          ...config,
          presets: config.presets.filter((preset) => preset.id !== id),
        });
      },
    }),
    [config, handleResult, saveConfigState, speed, stopAll, zoomSpeed],
  );

  return (
    <MainLayout>
      <section className="topbar">
        <div>
          <div className="brand-row">
            <div className="brand-mark">
              <RadioReceiver size={22} />
            </div>
            <div>
              <h1>Panevo</h1>
              <p>Live production and PTZ control</p>
            </div>
          </div>
        </div>
        <ConnectionStatus status={status} error={error} lastCommand={lastCommand} />
      </section>

      <section className="dashboard-grid">
        <div className="left-stack">
          <CameraSettings
            config={config}
            onConfigChange={setConfig}
            onSaved={(savedConfig) => {
              setConfig(savedConfig);
              setStatus({
                connected: false,
                mockMode: savedConfig.mockMode,
                protocol: savedConfig.protocol,
                message: savedConfig.mockMode ? 'Mock mode ready' : 'Disconnected',
              });
            }}
            onStatusChange={setStatus}
            onError={setError}
          />
          <div className="info-panel">
            <div className="panel-title">
              <Radio size={16} />
              <span>Camera Target</span>
            </div>
            <dl className="target-list">
              <div>
                <dt>Address</dt>
                <dd>{config.mockMode ? 'Mock transport' : config.ipAddress || 'Not configured'}</dd>
              </div>
              <div>
                <dt>VISCA</dt>
                <dd>
                  {config.protocol.toUpperCase()} / {config.port}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        <main className="operator-surface">
          <div className="surface-header">
            <div>
              <span className="eyebrow">PTZ MVP</span>
              <h2>Camera Control</h2>
            </div>
            <div className="surface-actions">
              <div className="surface-badge">
                <Zap size={15} />
                <span>{config.mockMode ? 'Mock enabled' : 'Hardware mode'}</span>
              </div>
              <Button variant="danger" className="emergency-stop-button" onClick={stopAll}>
                <OctagonX size={16} />
                Emergency Stop
              </Button>
            </div>
          </div>
          <div className="control-grid">
            <div className="control-card ptz-card">
              <PtzControls actions={actions} />
              <SpeedSelector label="PTZ speed" value={speed} min={1} max={24} onChange={setSpeed} />
            </div>
            <div className="control-card side-controls">
              <ZoomControls zoomSpeed={zoomSpeed} onZoomSpeedChange={setZoomSpeed} actions={actions} />
              <PresetGrid presets={config.presets} actions={actions} />
            </div>
          </div>
        </main>
      </section>
    </MainLayout>
  );
};
