import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/renderer/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/renderer/components/ui/dialog";
import { Input } from "@/renderer/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/renderer/components/ui/select";
import { Switch } from "@/renderer/components/ui/switch";
import type { AutomationRule, PanevoRaceEventType } from "@/shared/types";
import {
  automationBuilderRaceEvents,
  automationBuilderRaceStatuses,
  automationBuilderStopTargets,
  automationRuleDraftIsValid,
  automationRuleFromDraft,
  createAutomationBuilderAction,
  createAutomationRuleDraft,
  draftFromAutomationRule,
  type AutomationBuilderAction,
  type AutomationBuilderActionType,
  type AutomationBuilderRaceStatus,
  type AutomationBuilderStopTarget,
  type AutomationRuleDraft,
} from "./automation-builder-model";

export interface AutomationBuilderSourceStatus {
  available: boolean;
  label: string;
  reason: string;
  chipClassName: string;
}

interface AutomationRuleBuilderDialogProps {
  open: boolean;
  rule: AutomationRule | null;
  presetOptions: Array<{ value: string; label: string }>;
  obsSceneOptions: Array<{ value: string; label: string }>;
  rotorHazardTriggerSource: AutomationBuilderSourceStatus;
  saving?: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (rule: AutomationRule) => Promise<void> | void;
}

export const AutomationRuleBuilderDialog = ({
  open,
  rule,
  presetOptions,
  obsSceneOptions,
  rotorHazardTriggerSource,
  saving = false,
  onOpenChange,
  onSave,
}: AutomationRuleBuilderDialogProps) => {
  const [draft, setDraft] = useState<AutomationRuleDraft | null>(null);

  useEffect(() => {
    if (!open) {
      setDraft(null);
      return;
    }

    setDraft(
      rule ? draftFromAutomationRule(rule) : createAutomationRuleDraft(),
    );
  }, [open, rule]);

  const updateDraft = (update: Partial<AutomationRuleDraft>) => {
    setDraft((current) => (current ? { ...current, ...update } : current));
  };

  const updateAction = (
    actionId: string,
    update: Partial<AutomationBuilderAction>,
  ) => {
    setDraft((current) =>
      current
        ? {
            ...current,
            actions: current.actions.map((action) =>
              action.id === actionId ? { ...action, ...update } : action,
            ),
          }
        : current,
    );
  };

  const addAction = (type: AutomationBuilderActionType) => {
    setDraft((current) =>
      current
        ? {
            ...current,
            actions: [...current.actions, createAutomationBuilderAction(type)],
          }
        : current,
    );
  };

  const removeAction = (actionId: string) => {
    setDraft((current) =>
      current
        ? {
            ...current,
            actions: current.actions.filter((action) => action.id !== actionId),
          }
        : current,
    );
  };

  const moveAction = (actionId: string, direction: -1 | 1) => {
    setDraft((current) => {
      if (!current) {
        return current;
      }

      const index = current.actions.findIndex(
        (action) => action.id === actionId,
      );
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.actions.length) {
        return current;
      }

      const actions = [...current.actions];
      const [action] = actions.splice(index, 1);
      actions.splice(nextIndex, 0, action);
      return { ...current, actions };
    });
  };

  const saveDraft = async () => {
    if (!draft || !automationRuleDraftIsValid(draft)) {
      return;
    }

    await onSave(automationRuleFromDraft(draft));
    onOpenChange(false);
  };

  const presetAddDisabled = presetOptions.length === 0;
  const obsAddDisabled = obsSceneOptions.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="automation-builder-dialog">
        <DialogHeader>
          <DialogTitle>{rule ? "Edit rule" : "New rule"}</DialogTitle>
        </DialogHeader>

        {draft && (
          <div className="automation-builder">
            <section className="automation-builder-card">
              <span className="ctrl-section-label">Rule</span>
              <Input
                value={draft.label}
                onChange={(event) => updateDraft({ label: event.target.value })}
                placeholder="e.g. Race start → PTZ preset"
              />
            </section>

            <section className="automation-builder-card">
              <span className="ctrl-section-label">Trigger</span>
              <div
                className="automation-source-row"
                title={rotorHazardTriggerSource.reason}
              >
                <div className="automation-source-meta">
                  <strong>RotorHazard</strong>
                  <small>Race events</small>
                </div>
                <span
                  className={`status-chip ${rotorHazardTriggerSource.chipClassName}`}
                >
                  {rotorHazardTriggerSource.label}
                </span>
              </div>
              <Select
                value={draft.eventType || undefined}
                disabled={!rotorHazardTriggerSource.available}
                onValueChange={(eventType) =>
                  updateDraft({
                    eventType: eventType as PanevoRaceEventType,
                  })
                }
              >
                <SelectTrigger className="automation-builder-select">
                  <SelectValue
                    placeholder={
                      rotorHazardTriggerSource.available
                        ? "Select trigger"
                        : "RotorHazard unavailable"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {automationBuilderRaceEvents.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </section>

            <section className="automation-builder-card">
              <span className="ctrl-section-label">Conditions</span>
              <div className="automation-condition-list">
                <div
                  className={`automation-condition-row ${
                    draft.conditionNotStale
                      ? "automation-condition-row-active"
                      : ""
                  }`}
                >
                  <div className="automation-condition-meta">
                    <strong>Race data</strong>
                    <small>
                      {draft.conditionNotStale ? "Required" : "Ignored"}
                    </small>
                  </div>
                  <Switch
                    checked={draft.conditionNotStale}
                    onCheckedChange={(conditionNotStale) =>
                      updateDraft({ conditionNotStale })
                    }
                  />
                </div>
                <div
                  className={`automation-condition-row ${
                    draft.conditionStatus !== "any"
                      ? "automation-condition-row-active"
                      : ""
                  }`}
                >
                  <div className="automation-condition-meta">
                    <strong>Race status</strong>
                    <small>{getRaceStatusLabel(draft.conditionStatus)}</small>
                  </div>
                  <Select
                    value={draft.conditionStatus}
                    onValueChange={(conditionStatus) =>
                      updateDraft({
                        conditionStatus:
                          conditionStatus as AutomationBuilderRaceStatus,
                      })
                    }
                  >
                    <SelectTrigger className="automation-builder-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {automationBuilderRaceStatuses.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </section>

            <section className="automation-builder-card">
              <div className="automation-builder-card-header">
                <span className="ctrl-section-label">Actions</span>
                <div className="automation-builder-add-actions">
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    disabled={presetAddDisabled}
                    title={
                      presetAddDisabled
                        ? "No presets on active camera"
                        : "Add preset action"
                    }
                    aria-label={
                      presetAddDisabled
                        ? "Preset action unavailable"
                        : "Add preset action"
                    }
                    onClick={() => addAction("preset.recall")}
                  >
                    <Plus size={12} />
                    Preset
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    disabled={obsAddDisabled}
                    title={
                      obsAddDisabled
                        ? "No OBS scenes available"
                        : "Add OBS scene action"
                    }
                    aria-label={
                      obsAddDisabled
                        ? "OBS action unavailable"
                        : "Add OBS scene action"
                    }
                    onClick={() => addAction("obs.scene.switch")}
                  >
                    <Plus size={12} />
                    OBS
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => addAction("camera.stop")}
                  >
                    <Plus size={12} />
                    Stop
                  </Button>
                </div>
              </div>

              <div className="automation-builder-actions">
                {draft.actions.length === 0 ? (
                  <div className="automation-builder-empty">
                    <strong>No actions yet</strong>
                    <p>Add a Preset, OBS, or Stop action above.</p>
                  </div>
                ) : null}
                {draft.actions.map((action, index) => {
                  const presetActionAvailable =
                    presetOptions.length > 0 ||
                    (action.type === "preset.recall" &&
                      action.presetNumber.trim().length > 0);
                  const obsActionAvailable =
                    obsSceneOptions.length > 0 ||
                    (action.type === "obs.scene.switch" &&
                      action.sceneName.trim().length > 0);

                  return (
                    <div
                      className="automation-builder-action-card"
                      key={action.id}
                    >
                      <Select
                        value={action.type}
                        onValueChange={(type) =>
                          updateAction(action.id, {
                            type: type as AutomationBuilderActionType,
                          })
                        }
                      >
                        <SelectTrigger className="automation-builder-action-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem
                            value="preset.recall"
                            disabled={!presetActionAvailable}
                            title={
                              presetActionAvailable
                                ? undefined
                                : "No presets on active camera"
                            }
                          >
                            Preset
                          </SelectItem>
                          <SelectItem
                            value="obs.scene.switch"
                            disabled={!obsActionAvailable}
                            title={
                              obsActionAvailable
                                ? undefined
                                : "No OBS scenes available"
                            }
                          >
                            OBS
                          </SelectItem>
                          <SelectItem value="camera.stop">Stop</SelectItem>
                        </SelectContent>
                      </Select>

                      <div className="automation-builder-action-fields">
                        <AutomationBuilderActionFields
                          action={action}
                          presetOptions={presetOptions}
                          obsSceneOptions={obsSceneOptions}
                          onChange={(update) => updateAction(action.id, update)}
                        />
                      </div>

                      <div className="automation-builder-action-buttons">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-xs"
                          aria-label="Move action up"
                          disabled={index === 0}
                          onClick={() => moveAction(action.id, -1)}
                        >
                          <ArrowUp size={12} />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-xs"
                          aria-label="Move action down"
                          disabled={index === draft.actions.length - 1}
                          onClick={() => moveAction(action.id, 1)}
                        >
                          <ArrowDown size={12} />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          aria-label="Remove action"
                          className="automation-builder-action-delete"
                          onClick={() => removeAction(action.id)}
                        >
                          <Trash2 size={12} />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void saveDraft()}
            disabled={!automationRuleDraftIsValid(draft) || saving}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const getRaceStatusLabel = (status: AutomationBuilderRaceStatus): string => {
  if (status === "any") {
    return "Any status";
  }

  return (
    automationBuilderRaceStatuses.find((option) => option.value === status)
      ?.label ?? status
  );
};

const AutomationBuilderActionFields = ({
  action,
  presetOptions,
  obsSceneOptions,
  onChange,
}: {
  action: AutomationBuilderAction;
  presetOptions: Array<{ value: string; label: string }>;
  obsSceneOptions: Array<{ value: string; label: string }>;
  onChange: (update: Partial<AutomationBuilderAction>) => void;
}) => {
  if (action.type === "preset.recall") {
    const options = includeCurrentOption(
      presetOptions,
      action.presetNumber,
      `Preset ${action.presetNumber}`,
    );
    const hasOptions = options.length > 0;

    return (
      <Select
        value={action.presetNumber || undefined}
        disabled={!hasOptions}
        onValueChange={(presetNumber) => onChange({ presetNumber })}
      >
        <SelectTrigger className="automation-builder-select">
          <SelectValue placeholder="Select preset" />
        </SelectTrigger>
        <SelectContent>
          {hasOptions ? (
            options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))
          ) : (
            <SelectItem value="no-presets" disabled>
              No presets
            </SelectItem>
          )}
        </SelectContent>
      </Select>
    );
  }

  if (action.type === "obs.scene.switch") {
    const options = includeCurrentOption(
      obsSceneOptions,
      action.sceneName,
      action.sceneName,
    );
    const hasOptions = options.length > 0;

    return (
      <Select
        value={action.sceneName || undefined}
        disabled={!hasOptions}
        onValueChange={(sceneName) => onChange({ sceneName })}
      >
        <SelectTrigger className="automation-builder-select">
          <SelectValue placeholder="Select OBS scene" />
        </SelectTrigger>
        <SelectContent>
          {hasOptions ? (
            options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))
          ) : (
            <SelectItem value="no-obs-scenes" disabled>
              No OBS scenes
            </SelectItem>
          )}
        </SelectContent>
      </Select>
    );
  }

  return (
    <Select
      value={action.stopTarget}
      onValueChange={(stopTarget) =>
        onChange({ stopTarget: stopTarget as AutomationBuilderStopTarget })
      }
    >
      <SelectTrigger className="automation-builder-select">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {automationBuilderStopTargets.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

const includeCurrentOption = (
  options: Array<{ value: string; label: string }>,
  value: string,
  fallbackLabel: string,
): Array<{ value: string; label: string }> => {
  if (!value || options.some((option) => option.value === value)) {
    return options;
  }

  return [{ value, label: fallbackLabel }, ...options];
};
