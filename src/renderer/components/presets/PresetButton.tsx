import { Save, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { CameraPreset } from '../../types/camera';

interface PresetButtonProps {
  preset: CameraPreset;
  onRecall: (preset: number) => void;
  onStore: (preset: number) => void;
  onUpdate: (id: string, updates: Partial<Pick<CameraPreset, 'label' | 'cameraPreset'>>) => void;
  onDelete: (id: string) => void;
}

export const PresetButton = ({ preset, onRecall, onStore, onUpdate, onDelete }: PresetButtonProps) => {
  const [draftLabel, setDraftLabel] = useState(preset.label);
  const [draftPreset, setDraftPreset] = useState(preset.cameraPreset);

  useEffect(() => {
    setDraftLabel(preset.label);
    setDraftPreset(preset.cameraPreset);
  }, [preset.cameraPreset, preset.label]);

  const commitChanges = () => {
    onUpdate(preset.id, {
      label: draftLabel,
      cameraPreset: draftPreset,
    });
  };

  const storePreset = () => {
    if (window.confirm(`Overwrite camera preset ${preset.cameraPreset} (${preset.label}) with the current camera position?`)) {
      onStore(preset.cameraPreset);
    }
  };

  const deletePreset = () => {
    if (window.confirm(`Remove ${preset.label} from Panevo? This does not delete the preset from the camera.`)) {
      onDelete(preset.id);
    }
  };

  return (
    <div className="preset-tile">
      <button type="button" className="preset-recall" onClick={() => onRecall(preset.cameraPreset)}>
        <span>Camera preset</span>
        <strong>{preset.cameraPreset}</strong>
        <small>{preset.label}</small>
      </button>
      <form
        className="preset-edit-form"
        onSubmit={(event) => {
          event.preventDefault();
          commitChanges();
        }}
      >
        <input
          value={draftLabel}
          maxLength={32}
          aria-label={`${preset.label} label`}
          onChange={(event) => setDraftLabel(event.target.value)}
          onBlur={commitChanges}
        />
        <input
          type="number"
          min={1}
          max={255}
          value={draftPreset}
          aria-label={`${preset.label} camera preset number`}
          onChange={(event) => setDraftPreset(Number(event.target.value))}
          onBlur={commitChanges}
        />
      </form>
      <button type="button" className="preset-store" aria-label={`Store ${preset.label}`} title={`Store ${preset.label}`} onClick={storePreset}>
        <Save size={15} />
      </button>
      <button type="button" className="preset-delete" aria-label={`Remove ${preset.label}`} title={`Remove ${preset.label}`} onClick={deletePreset}>
        <Trash2 size={14} />
      </button>
    </div>
  );
};
