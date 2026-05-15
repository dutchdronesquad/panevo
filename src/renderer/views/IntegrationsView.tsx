import { useEffect, useMemo, useState } from "react";
import { PlugZap, Plus, Settings2, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/renderer/components/ui/alert-dialog";
import { Button } from "@/renderer/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/renderer/components/ui/dialog";
import { Input } from "@/renderer/components/ui/input";
import { Label } from "@/renderer/components/ui/label";
import { Stepper } from "@/renderer/components/Stepper";
import {
  integrationLifecycleChipClass,
  integrationLifecycleLabels,
  integrationRegistry,
  type IntegrationCategory,
  type IntegrationDefinition,
} from "../types/integration";
import type {
  IntegrationConfig,
  IntegrationConfigEntry,
} from "../types/camera";

const categoryLabels: Record<IntegrationCategory, string> = {
  production: "Production",
  race: "Race",
  "control-surface": "Control surface",
  "physical-input": "Physical input",
  automation: "Automation",
};

type ConfigurationDialogState = {
  integration: IntegrationDefinition;
  mode: "create" | "edit";
};

type SetupStep = "details" | "setup" | "review";

type IntegrationSettingsDraft = Record<string, string>;
type ObsTestState = {
  status: "loading" | "success" | "error";
  message: string;
  currentProgramSceneName?: string;
  scenes?: string[];
};

const setupSteps: { id: SetupStep; label: string }[] = [
  { id: "details", label: "Details" },
  { id: "setup", label: "Setup" },
  { id: "review", label: "Review" },
];

const createSettingsDraft = (
  integration: IntegrationDefinition,
  entry?: IntegrationConfigEntry,
): IntegrationSettingsDraft =>
  Object.fromEntries(
    integration.settings.map((setting) => {
      const storedValue = entry?.settings[setting.key];
      const value =
        typeof storedValue === "string" || typeof storedValue === "number"
          ? String(storedValue)
          : (setting.defaultValue ?? "");

      return [setting.key, value];
    }),
  );

const buildStoredSettings = (
  integration: IntegrationDefinition,
  draft: IntegrationSettingsDraft,
): Record<string, unknown> =>
  Object.fromEntries(
    integration.settings.map((setting) => [setting.key, draft[setting.key]]),
  );

const getSettingsSummary = (
  integration: IntegrationDefinition,
  entry: IntegrationConfigEntry,
): string => {
  const visibleSettings = integration.settings
    .map((setting) => {
      const value = entry.settings[setting.key];

      if (typeof value !== "string" || value.trim().length === 0) {
        return null;
      }

      if (setting.type === "password") {
        return `${setting.label}: set`;
      }

      return `${setting.label}: ${value}`;
    })
    .filter((setting): setting is string => Boolean(setting));

  return visibleSettings.slice(0, 2).join(" / ");
};

const getObsInputFromSettings = (
  settings: Record<string, unknown>,
): { host: string; port: number; password?: string } | null => {
  const host = typeof settings.host === "string" ? settings.host.trim() : "";
  const port = Number(settings.port);

  if (!host || !Number.isFinite(port)) {
    return null;
  }

  return {
    host,
    port,
    password:
      typeof settings.password === "string" && settings.password
        ? settings.password
        : undefined,
  };
};

const getObsInputFromDraft = (
  draft: IntegrationSettingsDraft,
): { host: string; port: number; password?: string } | null =>
  getObsInputFromSettings(draft);

interface IntegrationsViewProps {
  onIntegrationConfigChange?: (config: IntegrationConfig) => void;
}

export const IntegrationsView = ({
  onIntegrationConfigChange,
}: IntegrationsViewProps) => {
  const [configurationDialog, setConfigurationDialog] =
    useState<ConfigurationDialogState | null>(null);
  const [setupStep, setSetupStep] = useState<SetupStep>("details");
  const [settingsDraft, setSettingsDraft] = useState<IntegrationSettingsDraft>(
    {},
  );
  const [integrationToRemove, setIntegrationToRemove] =
    useState<IntegrationDefinition | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [configuredEntries, setConfiguredEntries] = useState<
    IntegrationConfigEntry[]
  >([]);
  const [configError, setConfigError] = useState<string | null>(null);
  const [obsTestStates, setObsTestStates] = useState<
    Record<string, ObsTestState>
  >({});
  const [configurationObsTestState, setConfigurationObsTestState] =
    useState<ObsTestState | null>(null);

  const configuredIntegrations = useMemo(
    () =>
      configuredEntries
        .map((entry) => ({
          entry,
          definition:
            integrationRegistry.find(
              (integration) => integration.id === entry.integrationId,
            ) ?? null,
        }))
        .filter(
          (
            item,
          ): item is {
            entry: IntegrationConfigEntry;
            definition: IntegrationDefinition;
          } => Boolean(item.definition),
        ),
    [configuredEntries],
  );

  const configuredIntegrationIds = useMemo(
    () => configuredEntries.map((entry) => entry.integrationId),
    [configuredEntries],
  );

  const availableIntegrations = useMemo(
    () =>
      integrationRegistry.filter(
        (integration) => !configuredIntegrationIds.includes(integration.id),
      ),
    [configuredIntegrationIds],
  );

  const metrics = useMemo(() => {
    const available = integrationRegistry.length;
    const configured = configuredEntries.length;
    const enabled = configuredEntries.filter((entry) =>
      ["enabled", "connected"].includes(entry.lifecycleState),
    ).length;

    return { available, configured, enabled };
  }, [configuredEntries]);

  const configurationEntry = useMemo(
    () =>
      configurationDialog
        ? configuredEntries.find(
            (entry) =>
              entry.integrationId === configurationDialog.integration.id,
          )
        : undefined,
    [configurationDialog, configuredEntries],
  );

  const configurationCanSave = useMemo(() => {
    if (!configurationDialog) {
      return false;
    }

    return configurationDialog.integration.settings.every(
      (setting) =>
        !setting.required || settingsDraft[setting.key]?.trim().length > 0,
    );
  }, [configurationDialog, settingsDraft]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const result = await window.panevo.getIntegrationConfig();
      if (cancelled) {
        return;
      }

      if (!result.ok) {
        setConfigError(`${result.error.code}: ${result.error.message}`);
        return;
      }

      setConfiguredEntries(result.data.integrations);
      onIntegrationConfigChange?.(result.data);
      setConfigError(null);
    })();

    return () => {
      cancelled = true;
    };
  }, [onIntegrationConfigChange]);

  const saveIntegrationEntries = async (
    entries: IntegrationConfigEntry[],
  ): Promise<boolean> => {
    setConfiguredEntries(entries);
    const result = await window.panevo.saveIntegrationConfig({
      integrations: entries,
    });

    if (!result.ok) {
      setConfigError(`${result.error.code}: ${result.error.message}`);
      return false;
    }

    setConfiguredEntries(result.data.integrations);
    onIntegrationConfigChange?.(result.data);
    setConfigError(null);
    return true;
  };

  const openConfigurationDialog = (
    integration: IntegrationDefinition,
    mode: ConfigurationDialogState["mode"],
  ) => {
    const entry = configuredEntries.find(
      (configuredEntry) => configuredEntry.integrationId === integration.id,
    );

    setSettingsDraft(createSettingsDraft(integration, entry));
    setConfigurationObsTestState(null);
    setConfigurationDialog({ integration, mode });
    setSetupStep(mode === "create" ? "details" : "setup");
  };

  const startIntegrationSetup = (integration: IntegrationDefinition) => {
    setAddDialogOpen(false);
    openConfigurationDialog(
      integration,
      configuredIntegrationIds.includes(integration.id) ? "edit" : "create",
    );
  };

  const saveConfiguration = () => {
    void (async () => {
      if (!configurationDialog) {
        return;
      }

      const { integration } = configurationDialog;
      const existingEntry = configuredEntries.find(
        (entry) => entry.integrationId === integration.id,
      );
      const nextEntry: IntegrationConfigEntry = {
        id: existingEntry?.id ?? `integration-${integration.id}`,
        integrationId: integration.id,
        lifecycleState: existingEntry?.lifecycleState ?? "configured",
        settings: buildStoredSettings(integration, settingsDraft),
        updatedAt: new Date().toISOString(),
      };
      const nextEntries = existingEntry
        ? configuredEntries.map((entry) =>
            entry.integrationId === integration.id ? nextEntry : entry,
          )
        : [...configuredEntries, nextEntry];

      const saved = await saveIntegrationEntries(nextEntries);
      if (saved) {
        setConfigurationDialog(null);
        setConfigurationObsTestState(null);
        setSetupStep("details");
      }
    })();
  };

  const moveSetupStep = (direction: "back" | "next") => {
    const currentIndex = setupSteps.findIndex((step) => step.id === setupStep);
    const nextIndex =
      direction === "next"
        ? Math.min(currentIndex + 1, setupSteps.length - 1)
        : Math.max(currentIndex - 1, 0);

    setSetupStep(setupSteps[nextIndex].id);
  };

  const toggleIntegration = (integrationId: string) => {
    const nextEntries: IntegrationConfigEntry[] = configuredEntries.map(
      (entry) => {
        if (entry.integrationId !== integrationId) {
          return entry;
        }

        const lifecycleState: IntegrationConfigEntry["lifecycleState"] = [
          "enabled",
          "connected",
        ].includes(entry.lifecycleState)
          ? "disabled"
          : "enabled";

        return {
          ...entry,
          lifecycleState,
          updatedAt: new Date().toISOString(),
        };
      },
    );
    void saveIntegrationEntries(nextEntries);
  };

  const removeIntegration = (integrationId: string) => {
    void saveIntegrationEntries(
      configuredEntries.filter(
        (entry) => entry.integrationId !== integrationId,
      ),
    );
    if (configurationDialog?.integration.id === integrationId) {
      setConfigurationDialog(null);
      setConfigurationObsTestState(null);
    }
    setIntegrationToRemove(null);
  };

  const testObsDraft = () => {
    void (async () => {
      const input = getObsInputFromDraft(settingsDraft);

      if (!input) {
        setConfigurationObsTestState({
          status: "error",
          message: "OBS host and websocket port are required.",
        });
        return;
      }

      setConfigurationObsTestState({
        status: "loading",
        message: "Testing OBS websocket...",
      });

      const result = await window.panevo.getObsSceneList(input);

      setConfigurationObsTestState(
        result.ok
          ? {
              status: "success",
              message: `${result.data.scenes.length} OBS scenes available.`,
              currentProgramSceneName: result.data.currentProgramSceneName,
              scenes: result.data.scenes.map((scene) => scene.name).slice(0, 6),
            }
          : {
              status: "error",
              message: `${result.error.code}: ${result.error.message}`,
            },
      );
    })();
  };

  const testObsIntegration = (entry: IntegrationConfigEntry) => {
    void (async () => {
      const input = getObsInputFromSettings(entry.settings);

      if (!input) {
        setObsTestStates((states) => ({
          ...states,
          [entry.id]: {
            status: "error",
            message: "OBS host and websocket port are required.",
          },
        }));
        return;
      }

      setObsTestStates((states) => ({
        ...states,
        [entry.id]: {
          status: "loading",
          message: "Testing OBS websocket...",
        },
      }));

      const result = await window.panevo.getObsSceneList(input);

      setObsTestStates((states) => ({
        ...states,
        [entry.id]: result.ok
          ? {
              status: "success",
              message: `${result.data.scenes.length} OBS scenes available${result.data.currentProgramSceneName ? `, live: ${result.data.currentProgramSceneName}` : ""}.`,
              currentProgramSceneName: result.data.currentProgramSceneName,
              scenes: result.data.scenes.map((scene) => scene.name).slice(0, 4),
            }
          : {
              status: "error",
              message: `${result.error.code}: ${result.error.message}`,
            },
      }));
    })();
  };

  return (
    <main className="integrations-view">
      <div className="camera-overview integration-overview">
        <div className="camera-metric">
          <span>Integration registry</span>
          <strong>{metrics.available}</strong>
          <small>Known integration targets</small>
        </div>
        <div className="camera-metric">
          <span>Configured</span>
          <strong>{metrics.configured}</strong>
          <small>Stored configs live outside camera profiles</small>
        </div>
        <div className="camera-metric">
          <span>Active</span>
          <strong>{metrics.enabled}</strong>
          <small>Only active integrations appear in Control</small>
        </div>
      </div>

      <section className="integration-section">
        <div className="integration-section-header">
          <span className="ctrl-section-label">Integrations</span>
          <Button
            type="button"
            size="sm"
            onClick={() => setAddDialogOpen(true)}
          >
            <Plus />
            Add integration
          </Button>
        </div>

        <div className="integration-list" role="list">
          {configError && (
            <div className="integration-error" role="status">
              {configError}
            </div>
          )}

          {configuredIntegrations.length === 0 && (
            <div className="integration-empty-state">
              <strong>No integrations configured</strong>
              <span>
                Add an integration when you want Panevo to talk to external
                software, hardware, or automation surfaces.
              </span>
            </div>
          )}

          {configuredIntegrations.map(({ entry, definition: integration }) => {
            const IntegrationIcon = integration.icon;
            const chipClass =
              integrationLifecycleChipClass[entry.lifecycleState];
            const lifecycleLabel =
              integrationLifecycleLabels[entry.lifecycleState];
            const enabled = ["enabled", "connected"].includes(
              entry.lifecycleState,
            );
            const settingsSummary = getSettingsSummary(integration, entry);
            const obsTestState = obsTestStates[entry.id];
            const canTestObs =
              integration.id === "obs" && obsTestState?.status !== "loading";

            return (
              <article
                className="integration-row"
                key={entry.id}
                role="listitem"
              >
                <div className="integration-icon">
                  <IntegrationIcon size={20} />
                </div>

                <div className="integration-main">
                  <div className="integration-title-row">
                    <h3>{integration.name}</h3>
                    <span className={`status-chip ${chipClass}`}>
                      {lifecycleLabel}
                    </span>
                  </div>
                  <p>{integration.description}</p>
                  {settingsSummary && (
                    <div className="integration-settings-summary">
                      {settingsSummary}
                    </div>
                  )}
                  {obsTestState && (
                    <div
                      className={`integration-test-result integration-test-result-${obsTestState.status}`}
                    >
                      <span>{obsTestState.message}</span>
                      {obsTestState.scenes &&
                        obsTestState.scenes.length > 0 && (
                          <small>{obsTestState.scenes.join(" / ")}</small>
                        )}
                    </div>
                  )}
                </div>

                <div className="integration-actions">
                  <Button
                    type="button"
                    variant={enabled ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => toggleIntegration(integration.id)}
                  >
                    {enabled ? "Disable in Control" : "Enable in Control"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => openConfigurationDialog(integration, "edit")}
                  >
                    <Settings2 />
                    {integration.primaryAction}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={!canTestObs}
                    onClick={() => testObsIntegration(entry)}
                  >
                    <PlugZap />
                    {obsTestState?.status === "loading"
                      ? "Testing..."
                      : integration.testActionLabel}
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => setIntegrationToRemove(integration)}
                  >
                    <Trash2 />
                    Remove
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="integration-dialog">
          <DialogHeader>
            <DialogTitle>Add integration</DialogTitle>
            <DialogDescription>
              Choose an integration to configure. It will stay disabled until
              you explicitly enable it.
            </DialogDescription>
          </DialogHeader>

          <div className="integration-picker-list">
            {availableIntegrations.length === 0 && (
              <div className="integration-empty-state integration-empty-state--compact">
                <strong>All integrations are already added</strong>
                <span>
                  Remove one from the integration list before adding it again.
                </span>
              </div>
            )}

            {availableIntegrations.map((integration) => {
              const IntegrationIcon = integration.icon;

              return (
                <button
                  type="button"
                  className="integration-picker-row"
                  key={integration.id}
                  onClick={() => startIntegrationSetup(integration)}
                >
                  <span className="integration-icon">
                    <IntegrationIcon size={18} />
                  </span>
                  <span className="integration-picker-copy">
                    <strong>{integration.name}</strong>
                    <span>{integration.description}</span>
                  </span>
                  <span className="integration-picker-meta">
                    {categoryLabels[integration.category]}
                  </span>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={configurationDialog !== null}
        onOpenChange={(open) => {
          if (!open) {
            setConfigurationDialog(null);
            setConfigurationObsTestState(null);
            setSetupStep("details");
          }
        }}
      >
        <DialogContent className="integration-dialog">
          {configurationDialog && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {configurationDialog.integration.name}
                </DialogTitle>
                <DialogDescription>
                  {configurationDialog.mode === "create"
                    ? "New integration setup"
                    : configurationDialog.integration.description}
                </DialogDescription>
              </DialogHeader>

              <div className="integration-setup-panel">
                <Stepper steps={setupSteps} currentStepId={setupStep} />

                <div className="integration-setup-content">
                  {setupStep === "details" && (
                    <div className="integration-detail-panel">
                      <div className="integration-detail-heading">
                        <span className="integration-icon">
                          {(() => {
                            const IntegrationIcon =
                              configurationDialog.integration.icon;

                            return <IntegrationIcon size={20} />;
                          })()}
                        </span>
                        <div>
                          <strong>
                            {configurationDialog.integration.id === "obs"
                              ? "OBS Scenes in Control"
                              : categoryLabels[
                                  configurationDialog.integration.category
                                ]}
                          </strong>
                          <span>
                            {configurationDialog.integration.id === "obs"
                              ? "Configure first, then enable when you want it visible."
                              : configurationDialog.integration.phase}
                          </span>
                        </div>
                      </div>

                      <p>{configurationDialog.integration.description}</p>

                      <div className="integration-dialog-grid">
                        {configurationDialog.integration.id === "obs" ? (
                          <>
                            <div>
                              <span>Control view</span>
                              <strong>Shows an OBS Scenes section</strong>
                            </div>
                            <div>
                              <span>Enable in Control</span>
                              <strong>Makes scene switching available</strong>
                            </div>
                          </>
                        ) : (
                          <>
                            <div>
                              <span>Status</span>
                              <strong>
                                {
                                  integrationLifecycleLabels[
                                    configurationEntry?.lifecycleState ??
                                      "not-configured"
                                  ]
                                }
                              </strong>
                            </div>
                            <div>
                              <span>Control availability</span>
                              <strong>Enable after setup</strong>
                            </div>
                          </>
                        )}
                      </div>

                      <div className="integration-capabilities">
                        <span className="ctrl-section-label">
                          Expected capability
                        </span>
                        <ul>
                          {configurationDialog.integration.capabilities.map(
                            (capability) => (
                              <li key={capability}>{capability}</li>
                            ),
                          )}
                        </ul>
                      </div>
                    </div>
                  )}

                  {setupStep === "setup" && (
                    <div className="integration-detail-panel">
                      <div className="integration-detail-heading">
                        <div>
                          <strong>Local setup</strong>
                          <span>Stored in panevo-integrations.json</span>
                        </div>
                      </div>

                      <div className="integration-settings-form">
                        {configurationDialog.integration.settings.map(
                          (setting) => (
                            <div
                              className="integration-field"
                              key={setting.key}
                            >
                              <Label htmlFor={`integration-${setting.key}`}>
                                {setting.label}
                                {setting.required && (
                                  <span aria-hidden="true">*</span>
                                )}
                              </Label>
                              <Input
                                id={`integration-${setting.key}`}
                                type={setting.type}
                                value={settingsDraft[setting.key] ?? ""}
                                placeholder={setting.placeholder}
                                required={setting.required}
                                onChange={(event) => {
                                  if (
                                    configurationDialog.integration.id === "obs"
                                  ) {
                                    setConfigurationObsTestState(null);
                                  }

                                  setSettingsDraft((currentDraft) => ({
                                    ...currentDraft,
                                    [setting.key]: event.target.value,
                                  }));
                                }}
                              />
                              {setting.helperText && (
                                <span>{setting.helperText}</span>
                              )}
                            </div>
                          ),
                        )}
                      </div>

                      {configurationDialog.integration.id === "obs" && (
                        <div className="integration-obs-check">
                          <div className="integration-detail-heading">
                            <div>
                              <strong>OBS websocket check</strong>
                              <span>
                                Loads scenes and the current program scene from
                                OBS.
                              </span>
                            </div>
                          </div>

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={
                              configurationObsTestState?.status === "loading"
                            }
                            onClick={testObsDraft}
                          >
                            <PlugZap />
                            {configurationObsTestState?.status === "loading"
                              ? "Testing..."
                              : "Test and load scenes"}
                          </Button>

                          {configurationObsTestState && (
                            <div
                              className={`integration-test-result integration-test-result-${configurationObsTestState.status}`}
                            >
                              <span>{configurationObsTestState.message}</span>
                              {configurationObsTestState.currentProgramSceneName && (
                                <strong>
                                  Current program scene:{" "}
                                  {
                                    configurationObsTestState.currentProgramSceneName
                                  }
                                </strong>
                              )}
                              {configurationObsTestState.scenes &&
                                configurationObsTestState.scenes.length > 0 && (
                                  <small>
                                    {configurationObsTestState.scenes.join(
                                      " / ",
                                    )}
                                  </small>
                                )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {setupStep === "review" && (
                    <div className="integration-detail-panel">
                      <div className="integration-detail-heading">
                        <div>
                          <strong>Review</strong>
                          <span>
                            {configurationCanSave
                              ? "Ready to save"
                              : "Required setup is missing"}
                          </span>
                        </div>
                      </div>

                      <div className="integration-review-list">
                        {configurationDialog.integration.settings.map(
                          (setting) => {
                            const value = settingsDraft[setting.key]?.trim();
                            const displayValue =
                              setting.type === "password" && value
                                ? "Set"
                                : value || "Not set";

                            return (
                              <div key={setting.key}>
                                <span>{setting.label}</span>
                                <strong>{displayValue}</strong>
                              </div>
                            );
                          },
                        )}
                      </div>

                      {configurationDialog.integration.id === "obs" && (
                        <div className="integration-dialog-grid">
                          <div>
                            <span>Control view</span>
                            <strong>OBS Scenes section</strong>
                          </div>
                          <div>
                            <span>Scene switching</span>
                            <strong>Manual click-to-switch</strong>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter
                showCloseButton
                className="integration-wizard-footer"
              >
                {setupStep !== "details" && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => moveSetupStep("back")}
                  >
                    Back
                  </Button>
                )}
                {setupStep === "review" ? (
                  <Button
                    type="button"
                    disabled={!configurationCanSave}
                    onClick={saveConfiguration}
                  >
                    Save configuration
                  </Button>
                ) : (
                  <Button
                    type="button"
                    disabled={setupStep === "setup" && !configurationCanSave}
                    onClick={() => moveSetupStep("next")}
                  >
                    Next
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={integrationToRemove !== null}
        onOpenChange={(open) => {
          if (!open) {
            setIntegrationToRemove(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove integration?</AlertDialogTitle>
            <AlertDialogDescription>
              {integrationToRemove
                ? `${integrationToRemove.name} will be removed from Panevo's local integration configuration.`
                : "This integration will be removed from Panevo's local integration configuration."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (integrationToRemove) {
                  removeIntegration(integrationToRemove.id);
                }
              }}
            >
              Remove integration
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
};
