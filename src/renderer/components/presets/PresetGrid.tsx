import { PresetButton } from './PresetButton';
import type { CameraPreset } from '../../types/camera';
import { Button } from '../ui/Button';

interface PresetActions {
  recallPreset: (preset: number) => void;
  storePreset: (preset: number) => void;
  addPreset: () => void;
  updatePreset: (id: string, updates: Partial<Pick<CameraPreset, 'label' | 'cameraPreset'>>) => void;
  deletePreset: (id: string) => void;
}

interface PresetGridProps {
  presets: CameraPreset[];
  actions: PresetActions;
}

export const PresetGrid = ({ presets, actions }: PresetGridProps) => {
  return (
    <section className="preset-panel">
      <div className="preset-header">
        <div className="panel-title">Presets</div>
        <Button variant="ghost" size="sm" onClick={actions.addPreset}>
          Add preset
        </Button>
      </div>
      <div className="preset-list">
        {presets.length === 0 ? <div className="preset-empty">No presets configured</div> : null}
        {presets
          .slice()
          .sort((a, b) => a.cameraPreset - b.cameraPreset)
          .map((preset) => (
          <PresetButton
            key={preset.id}
            preset={preset}
            onRecall={actions.recallPreset}
            onStore={actions.storePreset}
            onUpdate={actions.updatePreset}
            onDelete={actions.deletePreset}
          />
        ))}
      </div>
    </section>
  );
};
