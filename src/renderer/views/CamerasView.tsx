import { CameraTable } from "../components/camera/CameraTable";
import type {
  CameraConfig,
  CameraProfile,
  OnvifProbeResult,
  OnvifProbeState,
} from "../types/camera";

interface CameraProfileActions {
  selectCamera: (cameraId: string) => void;
  addCamera: (
    camera: CameraProfile,
  ) => Promise<{ ok: boolean; error?: string }>;
  probeOnvif: (
    cameraId: string,
    auth?: { username?: string; password?: string },
  ) => Promise<{ ok: boolean; error?: string; result?: OnvifProbeResult }>;
  importOnvifPresets: (cameraId: string, result: OnvifProbeResult) => void;
  renameCamera: (cameraId: string, label: string) => void;
  deleteCamera: (cameraId: string) => void;
  importConfig: () => void;
  exportConfig: () => void;
}

interface CamerasViewProps {
  config: CameraConfig;
  activeCamera: CameraProfile;
  onvifProbeStates: Record<string, OnvifProbeState>;
  cameraProfileActions: CameraProfileActions;
  onCameraSave: (camera: CameraProfile) => void;
  onTestCamera: (cameraId: string) => void;
}

export const CamerasView = ({
  config,
  activeCamera,
  onvifProbeStates,
  cameraProfileActions,
  onCameraSave,
  onTestCamera,
}: CamerasViewProps) => {
  const hasCameras = config.cameras.length > 0;
  const activeControlValue =
    activeCamera.controlProtocol === "onvif"
      ? `ONVIF · ${activeCamera.onvifPort}`
      : `${activeCamera.protocol.toUpperCase()} · ${activeCamera.port}`;
  const activeControlSub =
    activeCamera.controlProtocol === "onvif"
      ? "ONVIF PTZ profile"
      : "VISCA IP profile";
  const activeSyncState = onvifProbeStates[activeCamera.id];
  const activeSyncValue =
    activeCamera.syncProtocol === "onvif"
      ? `ONVIF · ${activeCamera.onvifPort}`
      : "Local only";
  const activeSyncSub =
    activeCamera.syncProtocol === "onvif"
      ? activeSyncState?.status === "verified"
        ? `${activeCamera.presets.length} presets synced`
        : `${activeCamera.presets.length} presets · probe pending`
      : `${activeCamera.presets.length} local presets`;

  return (
    <main className="cameras-view">
      <div className="camera-overview">
        <div className="camera-metric">
          <span>Active camera</span>
          <strong>{hasCameras ? activeCamera.label : "No camera"}</strong>
          <small>
            {hasCameras
              ? activeCamera.ipAddress || "No address configured"
              : "Add a camera to start"}
          </small>
        </div>
        <div className="camera-metric">
          <span>Live control</span>
          <strong>{hasCameras ? activeControlValue : "-"}</strong>
          <small>
            {hasCameras && activeCamera.ipAddress
              ? activeControlSub
              : "Setup required"}
          </small>
        </div>
        <div className="camera-metric">
          <span>Sync</span>
          <strong>{hasCameras ? activeSyncValue : "-"}</strong>
          <small>{hasCameras ? activeSyncSub : "No active sync route"}</small>
        </div>
      </div>

      <section className="camera-table-section">
        <span className="ctrl-section-label">Camera bank</span>
        <CameraTable
          cameras={config.cameras}
          activeCameraId={config.activeCameraId}
          onvifProbeStates={onvifProbeStates}
          onSelect={cameraProfileActions.selectCamera}
          onAdd={cameraProfileActions.addCamera}
          onUpdate={onCameraSave}
          onTest={onTestCamera}
          onProbeOnvif={cameraProfileActions.probeOnvif}
          onImportOnvifPresets={cameraProfileActions.importOnvifPresets}
          onRename={cameraProfileActions.renameCamera}
          onDelete={cameraProfileActions.deleteCamera}
          onImport={cameraProfileActions.importConfig}
          onExport={cameraProfileActions.exportConfig}
        />
      </section>
    </main>
  );
};
