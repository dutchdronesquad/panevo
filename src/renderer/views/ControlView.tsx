import { Camera } from "lucide-react";
import { Button } from "@/renderer/components/ui/button";
import { FocusControls } from "../components/controls/FocusControls";
import { ObsScenesPanel } from "../components/obs/ObsScenesPanel";
import { PtzControls } from "../components/controls/PtzControls";
import { SpeedSelector } from "../components/controls/SpeedSelector";
import { ZoomControls } from "../components/controls/ZoomControls";
import { PresetGrid } from "../components/presets/PresetGrid";
import type {
  CameraPreset,
  CameraProfile,
  FocusMode,
  IntegrationConfigEntry,
} from "../types/camera";

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
  storePreset: (preset: number, label?: string) => void;
  addPreset: () => void;
  updatePreset: (
    id: string,
    updates: Partial<Pick<CameraPreset, "label" | "cameraPreset">>,
  ) => void;
  deletePreset: (id: string) => void;
}

interface ControlViewProps {
  activeCamera: CameraProfile;
  hasActiveCamera: boolean;
  actions: ControlActions;
  speed: number;
  zoomSpeed: number;
  focusMode: FocusMode;
  onSpeedChange: (speed: number) => void;
  onZoomSpeedChange: (speed: number) => void;
  onOpenCameras: () => void;
  obsIntegration?: IntegrationConfigEntry;
}

export const ControlView = ({
  activeCamera,
  hasActiveCamera,
  actions,
  speed,
  zoomSpeed,
  focusMode,
  onSpeedChange,
  onZoomSpeedChange,
  onOpenCameras,
  obsIntegration,
}: ControlViewProps) => {
  if (!hasActiveCamera) {
    return (
      <main className="operator-surface">
        <div className="control-empty-state">
          <div className="control-empty-icon">
            <Camera size={22} />
          </div>
          <div className="control-empty-copy">
            <h3>No active camera</h3>
            <p>
              Add and verify a camera profile before using live PTZ controls.
            </p>
          </div>
          <Button type="button" onClick={onOpenCameras}>
            Open cameras
          </Button>
        </div>
      </main>
    );
  }

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
              <SpeedSelector
                label="PTZ"
                value={speed}
                min={1}
                max={24}
                onChange={onSpeedChange}
              />
              <SpeedSelector
                label="Zoom"
                value={zoomSpeed}
                min={1}
                max={8}
                onChange={onZoomSpeedChange}
              />
            </div>
          </div>
        </div>

        <div className="presets-column">
          <PresetGrid
            presets={activeCamera.presets}
            controlProtocol={activeCamera.controlProtocol}
            syncProtocol={activeCamera.syncProtocol}
            actions={actions}
          />
          {obsIntegration && <ObsScenesPanel obsIntegration={obsIntegration} />}
        </div>
      </div>
    </main>
  );
};
