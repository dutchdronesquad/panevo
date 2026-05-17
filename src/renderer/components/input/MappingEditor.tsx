import { ShieldCheck, SlidersHorizontal } from "lucide-react";
import { SectionCard } from "@/renderer/components/SectionCard";
import { Button } from "@/renderer/components/ui/button";
import { Slider } from "@/renderer/components/ui/slider";
import { Switch } from "@/renderer/components/ui/switch";
import {
  type InputAxisAction,
  type InputButtonAction,
  type InputDeviceMappingProfile,
  formatInputAxisAssignment,
  formatInputButtonAssignment,
} from "@/shared/input-devices";

export type MappingCaptureTarget =
  | { kind: "axis"; action: InputAxisAction }
  | { kind: "button"; action: InputButtonAction };

const axisLabels: Record<InputAxisAction, string> = {
  pan: "Pan",
  tilt: "Tilt",
  zoom: "Zoom axis",
};

const buttonLabels: Record<InputButtonAction, string> = {
  deadman: "Deadman",
  stop: "Stop all",
  zoomIn: "Zoom in",
  zoomOut: "Zoom out",
};

interface MappingEditorProps {
  captureTarget: MappingCaptureTarget | null;
  onCaptureStart: (target: MappingCaptureTarget) => void;
  onUpdateAxis: (
    action: InputAxisAction,
    updates: Partial<InputDeviceMappingProfile["axes"][InputAxisAction]>,
  ) => void;
  onUpdateButton: (action: InputButtonAction, button: number | null) => void;
  profile: InputDeviceMappingProfile;
  selectedDeviceAvailable: boolean;
}

const getCaptureLabel = (
  currentTarget: MappingCaptureTarget | null,
  target: MappingCaptureTarget,
): string =>
  currentTarget?.kind === target.kind && currentTarget.action === target.action
    ? target.kind === "axis"
      ? "Move input..."
      : "Press input..."
    : "Capture";

export const MappingEditor = ({
  captureTarget,
  onCaptureStart,
  onUpdateAxis,
  onUpdateButton,
  profile,
  selectedDeviceAvailable,
}: MappingEditorProps) => (
  <section className="input-devices-grid">
    <SectionCard
      className="input-devices-card"
      contentClassName="input-devices-mapping-list"
      icon={SlidersHorizontal}
      title="Movement mapping"
    >
      {(Object.keys(axisLabels) as InputAxisAction[]).map((action) => {
        const mapping = profile.axes[action];
        const target: MappingCaptureTarget = { kind: "axis", action };

        return (
          <div
            className="input-devices-mapping-row input-devices-mapping-row--axis"
            key={action}
          >
            <div className="input-devices-mapping-title">
              <span>{axisLabels[action]}</span>
              <strong
                className="input-devices-assignment"
                data-assigned={mapping.axis !== null || undefined}
              >
                {formatInputAxisAssignment(mapping)}
              </strong>
            </div>
            <div className="input-devices-mapping-actions">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!selectedDeviceAvailable}
                onClick={() => onCaptureStart(target)}
              >
                {getCaptureLabel(captureTarget, target)}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onUpdateAxis(action, { axis: null })}
              >
                Clear
              </Button>
            </div>
            <div className="input-devices-axis-options">
              <label>
                <span>Invert</span>
                <Switch
                  checked={mapping.inverted}
                  onCheckedChange={(checked) =>
                    onUpdateAxis(action, { inverted: checked })
                  }
                />
              </label>
              <label>
                <span>Deadzone {mapping.deadzone.toFixed(2)}</span>
                <Slider
                  min={0}
                  max={0.5}
                  step={0.01}
                  value={[mapping.deadzone]}
                  onValueChange={([deadzone]) =>
                    onUpdateAxis(action, { deadzone })
                  }
                />
              </label>
              <label>
                <span>Max speed {mapping.maxSpeed}</span>
                <Slider
                  min={1}
                  max={24}
                  step={1}
                  value={[mapping.maxSpeed]}
                  onValueChange={([maxSpeed]) =>
                    onUpdateAxis(action, { maxSpeed })
                  }
                />
              </label>
            </div>
          </div>
        );
      })}
    </SectionCard>

    <SectionCard
      className="input-devices-card"
      contentClassName="input-devices-mapping-list"
      icon={ShieldCheck}
      title="Safety and actions"
    >
      {(Object.keys(buttonLabels) as InputButtonAction[]).map((action) => {
        const mapping = profile.buttons[action];
        const target: MappingCaptureTarget = { kind: "button", action };

        return (
          <div
            className="input-devices-mapping-row"
            data-action={action}
            data-assigned={mapping.button !== null || undefined}
            key={action}
          >
            <div className="input-devices-mapping-title">
              <span>{buttonLabels[action]}</span>
              <strong
                className="input-devices-assignment"
                data-assigned={mapping.button !== null || undefined}
              >
                {formatInputButtonAssignment(mapping)}
              </strong>
            </div>
            <div className="input-devices-mapping-actions">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!selectedDeviceAvailable}
                onClick={() => onCaptureStart(target)}
              >
                {getCaptureLabel(captureTarget, target)}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onUpdateButton(action, null)}
              >
                Clear
              </Button>
            </div>
          </div>
        );
      })}
    </SectionCard>
  </section>
);
