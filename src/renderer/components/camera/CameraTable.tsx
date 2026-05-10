import { Download, LoaderCircle, Pencil, PlugZap, Plus, Trash2, Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/renderer/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/renderer/components/ui/dialog';
import { Input } from '@/renderer/components/ui/input';
import { Label } from '@/renderer/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/renderer/components/ui/select';
import type { CameraProfile } from '../../types/camera';

interface CameraTableProps {
  cameras: CameraProfile[];
  activeCameraId: string;
  onSelect: (cameraId: string) => void;
  onAdd: (camera: CameraProfile) => Promise<CameraTableActionResult>;
  onUpdate: (camera: CameraProfile) => void;
  onTest: (cameraId: string) => void;
  onRename: (cameraId: string, label: string) => void;
  onDelete: (cameraId: string) => void;
  onImport: () => void;
  onExport: () => void;
}

interface CameraTableActionResult {
  ok: boolean;
  error?: string;
}

interface InlineNameProps {
  value: string;
  onSave: (label: string) => void;
}

const InlineName = ({ value, onSave }: InlineNameProps) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const commit = () => {
    const next = draft.trim();
    onSave(next || value);
    setEditing(false);
  };

  const cancel = () => {
    setDraft(value);
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        className="camera-name-input"
        value={draft}
        maxLength={40}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); commit(); }
          if (e.key === 'Escape') cancel();
        }}
        onClick={(e) => e.stopPropagation()}
      />
    );
  }

  return (
    <span
      className="camera-name-text"
      title="Click to rename"
      onClick={(e) => { e.stopPropagation(); setEditing(true); }}
    >
      {value}
    </span>
  );
};

const createCameraDraft = (cameraNumber: number): CameraProfile => ({
  id: `camera-${Date.now()}`,
  label: `Camera ${cameraNumber}`,
  ipAddress: '',
  port: 52381,
  protocol: 'udp',
  healthCheckMode: 'visca-inquiry',
  presets: [],
});

const sanitizeCamera = (camera: CameraProfile, fallbackLabel: string): CameraProfile => ({
  ...camera,
  label: camera.label.trim().slice(0, 40) || fallbackLabel,
  ipAddress: camera.ipAddress.trim(),
  port: Math.max(1, Math.min(65535, Math.round(camera.port || 52381))),
  protocol: camera.protocol === 'tcp' ? 'tcp' : 'udp',
  healthCheckMode: camera.healthCheckMode === 'transport-only' ? 'transport-only' : 'visca-inquiry',
});

interface CameraSettingsDialogProps {
  camera: CameraProfile;
  onSave: (camera: CameraProfile) => void;
}

const CameraSettingsDialog = ({ camera, onSave }: CameraSettingsDialogProps) => {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(camera);

  useEffect(() => {
    if (!open) {
      setDraft(camera);
    }
  }, [camera, open]);

  const updateDraft = <Key extends keyof CameraProfile>(key: Key, value: CameraProfile[Key]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const save = () => {
    onSave(sanitizeCamera(draft, camera.label));
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="secondary"
          onClick={(event) => event.stopPropagation()}
        >
          <Pencil size={13} />
          Settings
        </Button>
      </DialogTrigger>
      <DialogContent
        className="camera-dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle>Camera settings</DialogTitle>
        </DialogHeader>

        <form
          className="camera-dialog-form"
          onSubmit={(event) => {
            event.preventDefault();
            save();
          }}
        >
          <div className="field-row">
            <div className="field">
              <Label htmlFor={`camera-label-${camera.id}`}>Name</Label>
              <Input
                id={`camera-label-${camera.id}`}
                value={draft.label}
                maxLength={40}
                onChange={(event) => updateDraft('label', event.target.value)}
              />
            </div>

            <div className="field">
              <Label htmlFor={`camera-ip-${camera.id}`}>Camera IP</Label>
              <Input
                id={`camera-ip-${camera.id}`}
                value={draft.ipAddress}
                placeholder="192.168.1.120"
                onChange={(event) => updateDraft('ipAddress', event.target.value)}
              />
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <Label htmlFor={`camera-port-${camera.id}`}>VISCA port</Label>
              <Input
                id={`camera-port-${camera.id}`}
                type="number"
                min={1}
                max={65535}
                value={draft.port}
                onChange={(event) => updateDraft('port', Number(event.target.value))}
              />
            </div>

            <div className="field">
              <Label>Protocol</Label>
              <Select
                value={draft.protocol}
                onValueChange={(value) => updateDraft('protocol', value as CameraProfile['protocol'])}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="udp">UDP</SelectItem>
                  <SelectItem value="tcp">TCP</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="field">
            <Label>Health check</Label>
            <Select
              value={draft.healthCheckMode}
              onValueChange={(value) => updateDraft('healthCheckMode', value as CameraProfile['healthCheckMode'])}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="visca-inquiry">VISCA response verified</SelectItem>
                <SelectItem value="transport-only">Transport ready fallback</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">Cancel</Button>
            </DialogClose>
            <Button type="submit">Save settings</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

interface AddCameraDialogProps {
  cameraNumber: number;
  onAdd: (camera: CameraProfile) => Promise<CameraTableActionResult>;
}

const AddCameraDialog = ({ cameraNumber, onAdd }: AddCameraDialogProps) => {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => createCameraDraft(cameraNumber));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setDraft(createCameraDraft(cameraNumber));
      setError(null);
      setSubmitting(false);
    }
  }, [cameraNumber, open]);

  const updateDraft = <Key extends keyof CameraProfile>(key: Key, value: CameraProfile[Key]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const addCamera = async () => {
    setSubmitting(true);
    setError(null);

    const result = await onAdd(sanitizeCamera(draft, `Camera ${cameraNumber}`));
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error ?? 'Camera connection failed.');
      return;
    }

    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus size={13} />
          Add
        </Button>
      </DialogTrigger>
      <DialogContent className="camera-dialog">
        <DialogHeader>
          <DialogTitle>Add camera</DialogTitle>
        </DialogHeader>

        <form
          className="camera-dialog-form"
          onSubmit={(event) => {
            event.preventDefault();
            void addCamera();
          }}
        >
          <div className="field-row">
            <div className="field">
              <Label htmlFor="add-camera-label">Name</Label>
              <Input
                id="add-camera-label"
                value={draft.label}
                maxLength={40}
                onChange={(event) => updateDraft('label', event.target.value)}
              />
            </div>

            <div className="field">
              <Label htmlFor="add-camera-ip">Camera IP</Label>
              <Input
                id="add-camera-ip"
                value={draft.ipAddress}
                placeholder="192.168.1.120"
                onChange={(event) => updateDraft('ipAddress', event.target.value)}
              />
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <Label htmlFor="add-camera-port">VISCA port</Label>
              <Input
                id="add-camera-port"
                type="number"
                min={1}
                max={65535}
                value={draft.port}
                onChange={(event) => updateDraft('port', Number(event.target.value))}
              />
            </div>

            <div className="field">
              <Label>Protocol</Label>
              <Select
                value={draft.protocol}
                onValueChange={(value) => updateDraft('protocol', value as CameraProfile['protocol'])}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="udp">UDP</SelectItem>
                  <SelectItem value="tcp">TCP</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="field">
            <Label>Health check</Label>
            <Select
              value={draft.healthCheckMode}
              onValueChange={(value) => updateDraft('healthCheckMode', value as CameraProfile['healthCheckMode'])}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="visca-inquiry">VISCA response verified</SelectItem>
                <SelectItem value="transport-only">Transport ready fallback</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error && <div className="camera-dialog-error">{error}</div>}

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary" disabled={submitting}>Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={submitting || draft.ipAddress.trim().length === 0}>
              {submitting && <LoaderCircle className="camera-dialog-spinner" size={13} />}
              {submitting ? 'Testing...' : 'Test and add'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export const CameraTable = ({
  cameras,
  activeCameraId,
  onSelect,
  onAdd,
  onUpdate,
  onTest,
  onRename,
  onDelete,
  onImport,
  onExport,
}: CameraTableProps) => {
  return (
    <div className="camera-table-surface">
      <div className="camera-table-header">
        <div className="camera-table-title">Camera profiles</div>
        <div className="camera-table-actions">
          <Button size="sm" variant="secondary" onClick={onImport}>
            <Upload size={13} />
            Import
          </Button>
          <Button size="sm" variant="secondary" onClick={onExport}>
            <Download size={13} />
            Export
          </Button>
          <AddCameraDialog cameraNumber={cameras.length + 1} onAdd={onAdd} />
        </div>
      </div>

      <table className="camera-table">
        <thead>
          <tr>
            <th className="col-active" />
            <th className="col-name">Name</th>
            <th className="col-address">Address</th>
            <th className="col-protocol">Protocol</th>
            <th className="col-actions" />
          </tr>
        </thead>
        <tbody>
          {cameras.map((camera) => {
            const isActive = camera.id === activeCameraId;
            return (
              <tr
                key={camera.id}
                className={`camera-row${isActive ? ' camera-row--active' : ''}`}
                onClick={() => onSelect(camera.id)}
              >
                <td className="col-active">
                  {isActive && <span className="camera-active-dot" />}
                </td>
                <td className="col-name">
                  <InlineName value={camera.label} onSave={(label) => onRename(camera.id, label)} />
                </td>
                <td className="col-address">
                  {camera.ipAddress || <span className="camera-no-value">Not configured</span>}
                </td>
                <td className="col-protocol">
                  {camera.protocol.toUpperCase()} · {camera.port}
                </td>
                <td className="col-actions">
                  <div className="camera-row-actions">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={(e) => { e.stopPropagation(); onTest(camera.id); }}
                    >
                      <PlugZap size={13} />
                      Test
                    </Button>
                    <CameraSettingsDialog camera={camera} onSave={onUpdate} />
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="destructive"
                      className="camera-delete-btn"
                      aria-label={`Delete ${camera.label}`}
                      disabled={cameras.length <= 1}
                      onClick={(e) => { e.stopPropagation(); onDelete(camera.id); }}
                    >
                      <Trash2 size={13} />
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
