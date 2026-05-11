import { PresetButton } from "./PresetButton";
import type {
  CameraControlProtocol,
  CameraPreset,
  CameraSyncProtocol,
} from "../../types/camera";
import { Button } from "@/renderer/components/ui/button";

interface PresetActions {
  recallPreset: (preset: number) => void;
  storePreset: (preset: number, label?: string) => void;
  addPreset: () => void;
  updatePreset: (
    id: string,
    updates: Partial<Pick<CameraPreset, "label" | "cameraPreset">>,
  ) => void;
  deletePreset: (id: string) => void;
}

interface PresetGridProps {
  presets: CameraPreset[];
  controlProtocol: CameraControlProtocol;
  syncProtocol: CameraSyncProtocol;
  actions: PresetActions;
}

export const PresetGrid = ({
  presets,
  controlProtocol,
  syncProtocol,
  actions,
}: PresetGridProps) => {
  const syncNote =
    syncProtocol === "onvif"
      ? "ONVIF sync keeps camera-reported numeric presets aligned. Remove uses ONVIF; live recall and store use the selected control protocol."
      : "Preset names, delete, and preset-list import stay local. Live recall and store use the selected control protocol.";

  return (
    <section className="preset-panel">
      <div className="preset-header">
        <span className="ctrl-section-label">Presets</span>
        <Button
          variant="ghost"
          size="sm"
          disabled={presets.length >= 9}
          onClick={actions.addPreset}
        >
          Add
        </Button>
      </div>
      <p className="preset-sync-note">{syncNote}</p>
      <div className="preset-grid">
        {presets.length === 0 ? (
          <div className="preset-empty">No presets configured</div>
        ) : null}
        {presets
          .slice()
          .sort((a, b) => a.cameraPreset - b.cameraPreset)
          .map((preset) => (
            <PresetButton
              key={preset.id}
              preset={preset}
              controlProtocol={controlProtocol}
              syncProtocol={syncProtocol}
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
