import { FocusControls } from '../components/controls/FocusControls';
import { PtzControls } from '../components/controls/PtzControls';
import { SpeedSelector } from '../components/controls/SpeedSelector';
import { ZoomControls } from '../components/controls/ZoomControls';
import { PresetGrid } from '../components/presets/PresetGrid';
import type { CameraPreset, CameraProfile, FocusMode } from '../types/camera';

interface ControlActions {
  panLeft: () => void;
  panRight: () => void;
  tiltUp: () => void;
  tiltDown: () => void;
  moveUpLeft: () => void;
  moveUpRight: () => void;
  moveDownLeft: () => void;
  moveDownRight: () => void;
  stop: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomStop: () => void;
  setFocusMode: (mode: FocusMode) => void;
  focusIn: () => void;
  focusOut: () => void;
  focusStop: () => void;
  recallPreset: (preset: number) => void;
  storePreset: (preset: number) => void;
  addPreset: () => void;
  updatePreset: (id: string, updates: Partial<Pick<CameraPreset, 'label' | 'cameraPreset'>>) => void;
  deletePreset: (id: string) => void;
}

interface ControlViewProps {
  activeCamera: CameraProfile;
  actions: ControlActions;
  speed: number;
  zoomSpeed: number;
  focusMode: FocusMode;
  onSpeedChange: (speed: number) => void;
  onZoomSpeedChange: (speed: number) => void;
}

export const ControlView = ({
  activeCamera,
  actions,
  speed,
  zoomSpeed,
  focusMode,
  onSpeedChange,
  onZoomSpeedChange,
}: ControlViewProps) => {
  return (
    <main className="operator-surface">
      <div className="control-grid">

        <div className="ptz-column">
          <div className="ctrl-section-first">
            <span className="ctrl-section-label">PTZ</span>
            <PtzControls actions={actions} />
          </div>

          <div className="ctrl-section">
            <span className="ctrl-section-label">Zoom</span>
            <ZoomControls actions={actions} />
          </div>

          <div className="ctrl-section">
            <span className="ctrl-section-label">Focus</span>
            <FocusControls mode={focusMode} actions={actions} />
          </div>

          <div className="ctrl-section">
            <span className="ctrl-section-label">Speed</span>
            <div className="speed-grid">
              <SpeedSelector label="PTZ" value={speed} min={1} max={24} onChange={onSpeedChange} />
              <SpeedSelector label="Zoom" value={zoomSpeed} min={1} max={8} onChange={onZoomSpeedChange} />
            </div>
          </div>
        </div>

        <div className="presets-column">
          <PresetGrid presets={activeCamera.presets} actions={actions} />
        </div>

      </div>
    </main>
  );
};
