import { PresetButton } from './PresetButton';
import type { CameraPreset } from '../../types/camera';
import { Button } from '@/renderer/components/ui/button';

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
        <span className="ctrl-section-label">Presets</span>
        <Button variant="ghost" size="sm" disabled={presets.length >= 9} onClick={actions.addPreset}>
          Add
        </Button>
      </div>
      <div className="preset-grid">
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
