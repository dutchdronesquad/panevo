import { CameraTable } from '../components/camera/CameraTable';
import type { CameraConfig, CameraProfile } from '../types/camera';

interface CameraProfileActions {
  selectCamera: (cameraId: string) => void;
  addCamera: (camera: CameraProfile) => Promise<{ ok: boolean; error?: string }>;
  renameCamera: (cameraId: string, label: string) => void;
  deleteCamera: (cameraId: string) => void;
  importConfig: () => void;
  exportConfig: () => void;
}

interface CamerasViewProps {
  config: CameraConfig;
  activeCamera: CameraProfile;
  cameraProfileActions: CameraProfileActions;
  onCameraSave: (camera: CameraProfile) => void;
  onTestCamera: (cameraId: string) => void;
}

export const CamerasView = ({
  config,
  activeCamera,
  cameraProfileActions,
  onCameraSave,
  onTestCamera,
}: CamerasViewProps) => {
  return (
    <main className="cameras-view">
      <div className="camera-overview">
        <div className="camera-metric">
          <span>Active camera</span>
          <strong>{activeCamera.label}</strong>
          <small>{activeCamera.ipAddress || 'No address configured'}</small>
        </div>
        <div className="camera-metric">
          <span>VISCA target</span>
          <strong>
            {activeCamera.protocol.toUpperCase()} · {activeCamera.port}
          </strong>
          <small>{activeCamera.ipAddress ? 'Manual IP profile' : 'Setup required'}</small>
        </div>
        <div className="camera-metric">
          <span>Preset bank</span>
          <strong>{activeCamera.presets.length} / 9</strong>
          <small>Stored in this profile</small>
        </div>
      </div>

      <section className="camera-table-section">
        <span className="ctrl-section-label">Camera bank</span>
        <CameraTable
          cameras={config.cameras}
          activeCameraId={config.activeCameraId}
          onSelect={cameraProfileActions.selectCamera}
          onAdd={cameraProfileActions.addCamera}
          onUpdate={onCameraSave}
          onTest={onTestCamera}
          onRename={cameraProfileActions.renameCamera}
          onDelete={cameraProfileActions.deleteCamera}
          onImport={cameraProfileActions.importConfig}
          onExport={cameraProfileActions.exportConfig}
        />
      </section>
    </main>
  );
};
