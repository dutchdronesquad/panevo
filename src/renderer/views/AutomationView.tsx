import { Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/renderer/components/ui/button";
import { Switch } from "@/renderer/components/ui/switch";
import type {
  AutomationConfig,
  AutomationRule,
  AutomationState,
  CameraConfig,
  IntegrationConfig,
  IntegrationConfigEntry,
  ObsConnectionInput,
} from "@/shared/types";
import {
  AutomationRuleBuilderDialog,
  type AutomationBuilderSourceStatus,
} from "./AutomationRuleBuilderDialog";
import { canEditAutomationRule } from "./automation-builder-model";

type AutomationSelectOption = {
  value: string;
  label: string;
};

const formatDateTime = (value?: string): string => {
  if (!value) {
    return "None";
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
};

const getRunLabel = (state: AutomationState | null): string => {
  if (!state?.lastRunResult) {
    return "None";
  }

  return `${state.lastRunResult.status} - ${state.lastRunResult.ruleLabel}`;
};

const describeTrigger = (rule: AutomationRule): string => {
  if (rule.trigger.type === "race.event") {
    return rule.trigger.eventType ?? "race.event";
  }

  return rule.trigger.type;
};

const describeActions = (
  rule: AutomationRule,
  presetOptions: AutomationSelectOption[],
): string =>
  rule.actions
    .map((automationAction) => {
      const { action } = automationAction;
      if (action.type === "preset.recall") {
        const presetLabel = presetOptions.find(
          (option) => option.value === String(action.presetNumber),
        )?.label;
        return `Preset ${presetLabel ?? action.presetNumber}`;
      }
      if (action.type === "obs.scene.switch") {
        return `OBS ${action.sceneName}`;
      }
      if (action.type === "camera.stop") {
        return `Stop ${action.target}`;
      }

      return action.type;
    })
    .join(" -> ");

const getActivePresetOptions = (
  cameraConfig: CameraConfig,
): AutomationSelectOption[] => {
  const activeCamera =
    cameraConfig.cameras.find(
      (camera) => camera.id === cameraConfig.activeCameraId,
    ) ?? cameraConfig.cameras[0];

  return (
    activeCamera?.presets.map((preset) => ({
      value: String(preset.cameraPreset),
      label: preset.label,
    })) ?? []
  );
};

const getEnabledObsIntegration = (
  integrationConfig: IntegrationConfig,
): IntegrationConfigEntry | undefined =>
  integrationConfig.integrations.find(
    (integration) =>
      integration.integrationId === "obs" &&
      ["enabled", "connected"].includes(integration.lifecycleState),
  );

const getRotorHazardIntegration = (
  integrationConfig: IntegrationConfig,
): IntegrationConfigEntry | undefined =>
  integrationConfig.integrations.find(
    (integration) => integration.integrationId === "rotorhazard",
  );

const getObsConnectionInput = (
  obsIntegration: IntegrationConfigEntry | undefined,
): ObsConnectionInput | null => {
  if (!obsIntegration) {
    return null;
  }

  const host =
    typeof obsIntegration.settings.host === "string"
      ? obsIntegration.settings.host.trim()
      : "";
  const rawPort = obsIntegration.settings.port;
  const port =
    typeof rawPort === "number"
      ? rawPort
      : typeof rawPort === "string"
        ? Number(rawPort)
        : Number.NaN;

  if (!host || !Number.isFinite(port)) {
    return null;
  }

  return {
    host,
    port,
    password:
      typeof obsIntegration.settings.password === "string" &&
      obsIntegration.settings.password
        ? obsIntegration.settings.password
        : undefined,
    secure:
      typeof obsIntegration.settings.secure === "boolean"
        ? obsIntegration.settings.secure
        : undefined,
  };
};

const getRotorHazardSourceStatus = (
  rotorHazardIntegration: IntegrationConfigEntry | undefined,
): AutomationBuilderSourceStatus => {
  if (!rotorHazardIntegration) {
    return {
      available: false,
      label: "Not configured",
      reason: "Configure RotorHazard before choosing race triggers.",
      chipClassName: "chip-info",
    };
  }

  if (rotorHazardIntegration.lifecycleState === "disabled") {
    return {
      available: false,
      label: "Disabled",
      reason: "Enable RotorHazard before choosing race triggers.",
      chipClassName: "chip-info",
    };
  }

  if (
    !["enabled", "connected"].includes(rotorHazardIntegration.lifecycleState)
  ) {
    return {
      available: false,
      label: "Unavailable",
      reason: "RotorHazard must be enabled before choosing race triggers.",
      chipClassName: "chip-standby",
    };
  }

  const host =
    typeof rotorHazardIntegration.settings.host === "string"
      ? rotorHazardIntegration.settings.host.trim()
      : "";
  const rawPort = rotorHazardIntegration.settings.port;
  const port =
    typeof rawPort === "number"
      ? rawPort
      : typeof rawPort === "string"
        ? Number(rawPort)
        : Number.NaN;

  if (!host || !Number.isFinite(port)) {
    return {
      available: false,
      label: "Unavailable",
      reason: "RotorHazard host and port are required.",
      chipClassName: "chip-standby",
    };
  }

  return {
    available: true,
    label: "Available",
    reason: "RotorHazard race events are available.",
    chipClassName: "chip-live",
  };
};

export const AutomationView = () => {
  const [state, setState] = useState<AutomationState | null>(null);
  const [config, setConfig] = useState<AutomationConfig>({ rules: [] });
  const [presetOptions, setPresetOptions] = useState<AutomationSelectOption[]>(
    [],
  );
  const [obsSceneOptions, setObsSceneOptions] = useState<
    AutomationSelectOption[]
  >([]);
  const [rotorHazardTriggerSource, setRotorHazardTriggerSource] =
    useState<AutomationBuilderSourceStatus>({
      available: false,
      label: "Unknown",
      reason: "RotorHazard state is not loaded.",
      chipClassName: "chip-info",
    });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);

  const loadAutomation = useCallback(async () => {
    setError(null);
    const [stateResult, configResult, cameraConfigResult, integrationResult] =
      await Promise.all([
        window.panevo.getAutomationState(),
        window.panevo.getAutomationConfig(),
        window.panevo.getConfig(),
        window.panevo.getIntegrationConfig(),
      ]);

    setPresetOptions(
      cameraConfigResult.ok
        ? getActivePresetOptions(cameraConfigResult.data)
        : [],
    );

    const obsInput = integrationResult.ok
      ? getObsConnectionInput(getEnabledObsIntegration(integrationResult.data))
      : null;
    setRotorHazardTriggerSource(
      integrationResult.ok
        ? getRotorHazardSourceStatus(
            getRotorHazardIntegration(integrationResult.data),
          )
        : {
            available: false,
            label: "Unknown",
            reason: "RotorHazard state could not be loaded.",
            chipClassName: "chip-info",
          },
    );

    if (obsInput) {
      const sceneResult = await window.panevo.getObsSceneList(obsInput);
      setObsSceneOptions(
        sceneResult.ok
          ? sceneResult.data.scenes.map((scene) => ({
              value: scene.name,
              label: scene.name,
            }))
          : [],
      );
    } else {
      setObsSceneOptions([]);
    }

    if (!stateResult.ok) {
      setError(stateResult.error.message);
      return;
    }
    if (!configResult.ok) {
      setError(configResult.error.message);
      return;
    }

    setState(stateResult.data);
    setConfig(configResult.data);
  }, []);

  useEffect(() => {
    void loadAutomation().finally(() => setLoading(false));
  }, [loadAutomation]);

  const statusChip = useMemo(() => {
    if (!state) {
      return {
        className: "chip-info",
        label: loading ? "Loading" : "Unknown",
      };
    }

    if (!state.enabled) {
      return {
        className: "chip-info",
        label: "Disabled",
      };
    }

    return state.pausedReason
      ? {
          className: "chip-standby",
          label: "Paused",
        }
      : {
          className: "chip-live",
          label: "Enabled",
        };
  }, [loading, state]);

  const toggleAutomation = async (enabled: boolean) => {
    setSaving(true);
    setError(null);

    const result = await window.panevo.setAutomationEnabled(enabled);
    if (!result.ok) {
      setError(result.error.message);
      setSaving(false);
      return;
    }

    setState(result.data);
    setSaving(false);
  };

  const saveRules = async (rules: AutomationRule[]) => {
    setSaving(true);
    setError(null);

    const result = await window.panevo.saveAutomationConfig({ rules });
    if (!result.ok) {
      setError(result.error.message);
      setSaving(false);
      return;
    }

    setConfig(result.data);
    const stateResult = await window.panevo.getAutomationState();
    if (stateResult.ok) {
      setState(stateResult.data);
    }
    setSaving(false);
  };

  const openNewRule = () => {
    setEditingRule(null);
    setBuilderOpen(true);
  };

  const openEditRule = (rule: AutomationRule) => {
    setEditingRule(rule);
    setBuilderOpen(true);
  };

  const saveRule = async (rule: AutomationRule) => {
    const nextRules = config.rules.some((existing) => existing.id === rule.id)
      ? config.rules.map((existing) =>
          existing.id === rule.id ? rule : existing,
        )
      : [...config.rules, rule];

    await saveRules(nextRules);
  };

  const toggleRule = async (ruleId: string, enabled: boolean) => {
    await saveRules(
      config.rules.map((rule) =>
        rule.id === ruleId
          ? {
              ...rule,
              enabled,
            }
          : rule,
      ),
    );
  };

  const removeRule = async (ruleId: string) => {
    await saveRules(config.rules.filter((rule) => rule.id !== ruleId));
  };

  return (
    <main className="automation-view">
      <section className="automation-overview camera-overview">
        <div className="camera-metric">
          <span>Status</span>
          <strong>{state?.enabled ? "On" : "Off"}</strong>
          <small>
            {state?.enabled
              ? (state.pausedReason ?? "Ready")
              : "automation-disabled"}
          </small>
        </div>
        <div className="camera-metric">
          <span>Rules</span>
          <strong>{state?.ruleCount ?? 0}</strong>
          <small>Runtime</small>
        </div>
        <div className="camera-metric">
          <span>Last run</span>
          <strong>{getRunLabel(state)}</strong>
          <small>{formatDateTime(state?.updatedAt)}</small>
        </div>
      </section>

      <section className="settings-section">
        <div className="settings-section-header">
          <span className="ctrl-section-label">Runtime</span>
          <div className="settings-section-actions">
            <span className={`status-chip ${statusChip.className}`}>
              {statusChip.label}
            </span>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              aria-label="Refresh automation state"
              onClick={() => void loadAutomation()}
              disabled={loading || saving}
            >
              <RefreshCw size={14} />
            </Button>
            <label className="settings-switch">
              <span>Enabled</span>
              <Switch
                checked={state?.enabled ?? false}
                disabled={loading || saving}
                onCheckedChange={(checked) => void toggleAutomation(checked)}
              />
            </label>
          </div>
        </div>

        {error && <div className="settings-inline-error">{error}</div>}

        <div className="automation-run-panel">
          <div className="automation-run-row">
            <span>Last triggered rule</span>
            <strong>{state?.lastTriggeredRule?.label ?? "None"}</strong>
            <small>
              {formatDateTime(state?.lastTriggeredRule?.triggeredAt)}
            </small>
          </div>
          <div className="automation-run-row">
            <span>Last action result</span>
            <strong>{state?.lastRunResult?.message ?? "None"}</strong>
            <small>
              {state?.lastRunResult
                ? `${state.lastRunResult.status} - ${state.lastRunResult.actions.length} actions`
                : "No automation run"}
            </small>
          </div>
        </div>
      </section>

      <section className="settings-section">
        <div className="settings-section-header">
          <span className="ctrl-section-label">Rules</span>
          <Button
            type="button"
            size="sm"
            onClick={openNewRule}
            disabled={loading || saving}
          >
            <Plus size={14} />
            New rule
          </Button>
        </div>

        <div className="automation-rule-list">
          {config.rules.length === 0 ? (
            <div className="automation-rule-empty">
              <strong>No rules</strong>
            </div>
          ) : (
            config.rules.map((rule) => (
              <div className="automation-rule-row" key={rule.id}>
                <div className="automation-rule-meta">
                  <strong>{rule.label}</strong>
                  <small>
                    {describeTrigger(rule)} {"->"}{" "}
                    {describeActions(rule, presetOptions)}
                  </small>
                </div>
                <div className="automation-rule-actions">
                  <span
                    className={`status-chip ${
                      rule.enabled ? "chip-live" : "chip-info"
                    }`}
                  >
                    {rule.enabled ? "Enabled" : "Disabled"}
                  </span>
                  <Switch
                    size="sm"
                    checked={rule.enabled}
                    disabled={loading || saving}
                    aria-label={`${rule.label} enabled`}
                    onCheckedChange={(checked) =>
                      void toggleRule(rule.id, checked)
                    }
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    aria-label={`Edit ${rule.label}`}
                    onClick={() => openEditRule(rule)}
                    disabled={loading || saving || !canEditAutomationRule(rule)}
                  >
                    <Pencil size={14} />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    aria-label={`Delete ${rule.label}`}
                    onClick={() => void removeRule(rule.id)}
                    disabled={loading || saving}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
      <AutomationRuleBuilderDialog
        open={builderOpen}
        rule={editingRule}
        presetOptions={presetOptions}
        obsSceneOptions={obsSceneOptions}
        rotorHazardTriggerSource={rotorHazardTriggerSource}
        saving={saving}
        onOpenChange={(open) => {
          setBuilderOpen(open);
          if (!open) {
            setEditingRule(null);
          }
        }}
        onSave={saveRule}
      />
    </main>
  );
};
