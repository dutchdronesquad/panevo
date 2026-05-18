import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/renderer/components/ui/button";
import { Switch } from "@/renderer/components/ui/switch";
import type { AutomationState } from "@/shared/types";

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

export const AutomationView = () => {
  const [state, setState] = useState<AutomationState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadState = useCallback(async () => {
    setError(null);
    const result = await window.panevo.getAutomationState();
    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    setState(result.data);
  }, []);

  useEffect(() => {
    void loadState().finally(() => setLoading(false));
  }, [loadState]);

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
              onClick={() => void loadState()}
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
    </main>
  );
};
