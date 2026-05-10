import { Save, ShieldCheck, Unplug } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import type { CameraConfig, CameraConnectionStatus } from '../../types/camera';

interface CameraSettingsProps {
  config: CameraConfig;
  onConfigChange: (config: CameraConfig) => void;
  onSaved: (config: CameraConfig) => void;
  onStatusChange: (status: CameraConnectionStatus) => void;
  onError: (message: string | null) => void;
}

export const CameraSettings = ({
  config,
  onConfigChange,
  onSaved,
  onStatusChange,
  onError,
}: CameraSettingsProps) => {
  const saveConfig = async () => {
    const result = await window.panevo.saveConfig(config);
    if (result.ok) {
      onSaved(result.data);
      onError(null);
      return;
    }
    onError(result.error.message);
  };

  const testConnection = async () => {
    const saveResult = await window.panevo.saveConfig(config);
    if (!saveResult.ok) {
      onError(saveResult.error.message);
      return;
    }

    onSaved(saveResult.data);
    const result = await window.panevo.testConnection();
    if (result.ok) {
      onStatusChange(result.data);
      onError(null);
      return;
    }
    onError(result.error.message);
  };

  return (
    <Card title="Camera Settings">
      <div className="form-stack">
        <label className="field">
          <span>Camera IP address</span>
          <input
            value={config.ipAddress}
            placeholder="192.168.1.120"
            disabled={config.mockMode}
            onChange={(event) => onConfigChange({ ...config, ipAddress: event.target.value })}
          />
        </label>

        <div className="field-row">
          <label className="field">
            <span>VISCA port</span>
            <input
              type="number"
              min={1}
              max={65535}
              value={config.port}
              onChange={(event) => onConfigChange({ ...config, port: Number(event.target.value) })}
            />
          </label>

          <label className="field">
            <span>Protocol</span>
            <select
              value={config.protocol}
              onChange={(event) => onConfigChange({ ...config, protocol: event.target.value === 'tcp' ? 'tcp' : 'udp' })}
            >
              <option value="udp">UDP</option>
              <option value="tcp">TCP future</option>
            </select>
          </label>
        </div>

        <label className="toggle-row">
          <input
            type="checkbox"
            checked={config.mockMode}
            onChange={(event) => onConfigChange({ ...config, mockMode: event.target.checked })}
          />
          <span>
            <strong>Mock mode</strong>
            <small>Run controls without camera hardware.</small>
          </span>
        </label>

        <div className="button-row">
          <Button variant="primary" onClick={saveConfig}>
            <Save size={16} />
            Save
          </Button>
          <Button onClick={testConnection}>
            {config.mockMode ? <ShieldCheck size={16} /> : <Unplug size={16} />}
            Test
          </Button>
        </div>
      </div>
    </Card>
  );
};

