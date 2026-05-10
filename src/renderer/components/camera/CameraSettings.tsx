import { Save, Unplug } from 'lucide-react';
import { Button } from '@/renderer/components/ui/button';
import { Input } from '@/renderer/components/ui/input';
import { Label } from '@/renderer/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/renderer/components/ui/select';
import type { CameraProfile } from '../../types/camera';

interface CameraSettingsProps {
  camera: CameraProfile;
  onCameraChange: (camera: CameraProfile) => void;
  onSave: () => void;
  onTestConnection: () => void;
}

export const CameraSettings = ({ camera, onCameraChange, onSave, onTestConnection }: CameraSettingsProps) => {
  return (
    <div className="card camera-settings-card">
      <div className="card-title">Camera settings</div>
      <div className="form-stack">
        <div className="field">
          <Label htmlFor="camera-ip" className="field-label">IP address</Label>
          <Input
            id="camera-ip"
            value={camera.ipAddress}
            placeholder="192.168.1.120"
            onChange={(e) => onCameraChange({ ...camera, ipAddress: e.target.value })}
          />
        </div>

        <div className="field-row">
          <div className="field">
            <Label htmlFor="visca-port" className="field-label">VISCA port</Label>
            <Input
              id="visca-port"
              type="number"
              min={1}
              max={65535}
              value={camera.port}
              onChange={(e) => onCameraChange({ ...camera, port: Number(e.target.value) })}
            />
          </div>
          <div className="field">
            <Label htmlFor="camera-protocol" className="field-label">Protocol</Label>
            <Select
              value={camera.protocol}
              onValueChange={(v) => onCameraChange({ ...camera, protocol: v === 'tcp' ? 'tcp' : 'udp' })}
            >
              <SelectTrigger id="camera-protocol" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="udp">UDP</SelectItem>
                <SelectItem value="tcp">TCP</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="button-row">
          <Button onClick={onSave}>
            <Save size={15} />
            Save
          </Button>
          <Button variant="secondary" onClick={onTestConnection}>
            <Unplug size={15} />
            Test connection
          </Button>
        </div>
      </div>
    </div>
  );
};
