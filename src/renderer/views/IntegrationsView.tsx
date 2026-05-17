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
import {
  DeviceStatusPanel,
  type DeviceSelection,
} from "@/renderer/components/input/DeviceStatusPanel";
import { Stepper } from "@/renderer/components/Stepper";
import { defaultInputDeviceMappingProfile } from "@/shared/input-devices";
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
  "input-device": "Input device",
  automation: "Automation",
};

const setupStateLabels: Record<IntegrationDefinition["setupState"], string> = {
  available: "Available",
  planned: "Planned",
};

type ConfigurationDialogState = {
  integration: IntegrationDefinition;
  mode: "create" | "edit";
};

type SetupStep = "details" | "setup" | "review";

type IntegrationSettingsDraft = Record<string, string>;
type IntegrationTestState = {
  status: "loading" | "success" | "error";
  message: string;
  currentProgramSceneName?: string;
  scenes?: string[];
  socketId?: string;
};

const setupSteps: { id: SetupStep; label: string }[] = [
  { id: "details", label: "Details" },
  { id: "setup", label: "Setup" },
  { id: "review", label: "Review" },
];

const getSetupHeading = (integration: IntegrationDefinition): string => {
  if (integration.id === "obs") {
    return "OBS scenes in Control";
  }

  if (integration.id === "input-devices") {
    return "Input device";
  }

  if (integration.id === "rotorhazard") {
    return "Race state";
  }

  return categoryLabels[integration.category];
};

const getSetupSubtext = (integration: IntegrationDefinition): string => {
  if (integration.id === "obs") {
    return "Connect OBS, then enable it when scene switching should be visible.";
  }

  if (integration.id === "input-devices") {
    return "Select a device here. Configure mappings from Control Devices in the sidebar.";
  }

  if (integration.id === "rotorhazard") {
    return "Connect to RotorHazard over Socket.IO. Race events stay read-only in this phase.";
  }

  return "This integration is planned but not configurable in this build.";
};

const getSetupSummaryCards = (
  integration: IntegrationDefinition,
  configurationEntry?: IntegrationConfigEntry,
): { label: string; value: string }[] => {
  if (integration.id === "obs") {
    return [
      {
        label: "Control view",
        value: "Adds an OBS Scenes section",
      },
      {
        label: "Scene switching",
        value: "Uses the OBS WebSocket connection",
      },
    ];
  }

  if (integration.id === "input-devices") {
    return [];
  }

  if (integration.id === "rotorhazard") {
    return [
      {
        label: "Transport",
        value: "Socket.IO websocket",
      },
      {
        label: "Scope",
        value: "Read-only race state",
      },
    ];
  }

  return [
    {
      label: "Availability",
      value: setupStateLabels[integration.setupState],
    },
    {
      label: "Current status",
      value:
        integrationLifecycleLabels[
          configurationEntry?.lifecycleState ?? "not-configured"
        ],
    },
  ];
};

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
  integration.id === "input-devices"
    ? {
        selectedDeviceKey: draft.selectedDeviceKey,
        selectedDeviceName: draft.selectedDeviceName,
        selectedDeviceIndex: draft.selectedDeviceIndex,
        selectedDeviceMapping: draft.selectedDeviceMapping,
        inputProfile:
          draft.inputProfile || defaultInputDeviceMappingProfile.name,
        activeMappingProfileId: defaultInputDeviceMappingProfile.id,
        mappingProfile: defaultInputDeviceMappingProfile,
        mappingProfiles: [defaultInputDeviceMappingProfile],
      }
    : Object.fromEntries(
        integration.settings.map((setting) => [
          setting.key,
          draft[setting.key],
        ]),
      );

const getSettingsSummary = (
  integration: IntegrationDefinition,
  entry: IntegrationConfigEntry,
): string => {
  if (integration.id === "input-devices") {
    const deviceName = entry.settings.selectedDeviceName;
    const inputProfile = entry.settings.inputProfile;

    return [
      typeof deviceName === "string" && deviceName.trim().length > 0
        ? `Device: ${deviceName}`
        : null,
      typeof inputProfile === "string" && inputProfile.trim().length > 0
        ? `Profile: ${inputProfile}`
        : null,
    ]
      .filter((setting): setting is string => Boolean(setting))
      .join(" / ");
  }

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

const getRotorHazardInputFromSettings = (
  settings: Record<string, unknown>,
): { host: string; port: number } | null => {
  const host = typeof settings.host === "string" ? settings.host.trim() : "";
  const port = Number(settings.port ?? 5000);

  if (!host || !Number.isFinite(port)) {
    return null;
  }

  return {
    host,
    port,
  };
};

const getRotorHazardInputFromDraft = (
  draft: IntegrationSettingsDraft,
): { host: string; port: number } | null =>
  getRotorHazardInputFromSettings(draft);

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
    Record<string, IntegrationTestState>
  >({});
  const [configurationObsTestState, setConfigurationObsTestState] =
    useState<IntegrationTestState | null>(null);
  const [rotorHazardTestStates, setRotorHazardTestStates] = useState<
    Record<string, IntegrationTestState>
  >({});
  const [
    configurationRotorHazardTestState,
    setConfigurationRotorHazardTestState,
  ] = useState<IntegrationTestState | null>(null);

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
    const available = integrationRegistry.filter(
      (integration) => integration.setupState === "available",
    ).length;
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

  const isInputDevicesSetup =
    configurationDialog?.integration.id === "input-devices";

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
    setConfigurationRotorHazardTestState(null);
    setConfigurationDialog({ integration, mode });
    setSetupStep(mode === "create" ? "details" : "setup");
  };

  const startIntegrationSetup = (integration: IntegrationDefinition) => {
    if (integration.setupState !== "available") {
      return;
    }

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
      const settings = buildStoredSettings(integration, settingsDraft);
      if (integration.id === "input-devices" && existingEntry) {
        settings.inputProfile =
          existingEntry.settings.inputProfile ?? settings.inputProfile;
        settings.activeMappingProfileId =
          existingEntry.settings.activeMappingProfileId ??
          settings.activeMappingProfileId;
        settings.mappingProfile =
          existingEntry.settings.mappingProfile ?? settings.mappingProfile;
        settings.mappingProfiles =
          existingEntry.settings.mappingProfiles ?? settings.mappingProfiles;
      }

      const nextEntry: IntegrationConfigEntry = {
        id: existingEntry?.id ?? `integration-${integration.id}`,
        integrationId: integration.id,
        lifecycleState: existingEntry?.lifecycleState ?? "enabled",
        settings,
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

  const selectInputDevice = (device: DeviceSelection) => {
    setSettingsDraft((currentDraft) => ({
      ...currentDraft,
      selectedDeviceKey: device.key,
      selectedDeviceName: device.name,
      selectedDeviceIndex: String(device.index),
      selectedDeviceMapping: device.mapping,
      inputProfile: currentDraft.inputProfile || "Default profile",
    }));
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
      setConfigurationRotorHazardTestState(null);
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

  const testRotorHazardDraft = () => {
    void (async () => {
      const input = getRotorHazardInputFromDraft(settingsDraft);

      if (!input) {
        setConfigurationRotorHazardTestState({
          status: "error",
          message: "RotorHazard host and port are required.",
        });
        return;
      }

      setConfigurationRotorHazardTestState({
        status: "loading",
        message: "Testing RotorHazard Socket.IO...",
      });

      const result = await window.panevo.testRotorHazardConnection(input);

      setConfigurationRotorHazardTestState(
        result.ok
          ? {
              status: "success",
              message: result.data.message,
              socketId: result.data.socketId,
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

  const testRotorHazardIntegration = (entry: IntegrationConfigEntry) => {
    void (async () => {
      const input = getRotorHazardInputFromSettings(entry.settings);

      if (!input) {
        setRotorHazardTestStates((states) => ({
          ...states,
          [entry.id]: {
            status: "error",
            message: "RotorHazard host and port are required.",
          },
        }));
        return;
      }

      setRotorHazardTestStates((states) => ({
        ...states,
        [entry.id]: {
          status: "loading",
          message: "Testing RotorHazard Socket.IO...",
        },
      }));

      const result = await window.panevo.testRotorHazardConnection(input);

      setRotorHazardTestStates((states) => ({
        ...states,
        [entry.id]: result.ok
          ? {
              status: "success",
              message: result.data.message,
              socketId: result.data.socketId,
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
          <span>Available</span>
          <strong>{metrics.available}</strong>
          <small>Ready to configure</small>
        </div>
        <div className="camera-metric">
          <span>Configured</span>
          <strong>{metrics.configured}</strong>
          <small>Saved on this machine</small>
        </div>
        <div className="camera-metric">
          <span>Active</span>
          <strong>{metrics.enabled}</strong>
          <small>Enabled for operator use</small>
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
            const testState =
              integration.id === "rotorhazard"
                ? rotorHazardTestStates[entry.id]
                : obsTestStates[entry.id];
            const canTestObs =
              integration.id === "obs" && testState?.status !== "loading";
            const canTestRotorHazard =
              integration.id === "rotorhazard" &&
              testState?.status !== "loading";
            const canTestIntegration = canTestObs || canTestRotorHazard;

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
                  {testState && (
                    <div
                      className={`integration-test-result integration-test-result-${testState.status}`}
                    >
                      <span>{testState.message}</span>
                      {testState.scenes && testState.scenes.length > 0 && (
                        <small>{testState.scenes.join(" / ")}</small>
                      )}
                      {testState.socketId && (
                        <small>Socket.IO session {testState.socketId}</small>
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
                    {enabled ? "Disable" : "Enable"}
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
                    disabled={!canTestIntegration}
                    onClick={() => {
                      if (integration.id === "rotorhazard") {
                        testRotorHazardIntegration(entry);
                        return;
                      }

                      testObsIntegration(entry);
                    }}
                  >
                    <PlugZap />
                    {testState?.status === "loading"
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
              Choose an integration that is available in this build.
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
              const isPlanned = integration.setupState === "planned";

              return (
                <button
                  type="button"
                  className="integration-picker-row"
                  disabled={isPlanned}
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
                    {setupStateLabels[integration.setupState]}
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
            setConfigurationRotorHazardTestState(null);
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
                    ? getSetupSubtext(configurationDialog.integration)
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
                            {getSetupHeading(configurationDialog.integration)}
                          </strong>
                          <span>
                            {getSetupSubtext(configurationDialog.integration)}
                          </span>
                        </div>
                      </div>

                      <p>{configurationDialog.integration.description}</p>

                      {getSetupSummaryCards(
                        configurationDialog.integration,
                        configurationEntry,
                      ).length > 0 && (
                        <div className="integration-dialog-grid">
                          {getSetupSummaryCards(
                            configurationDialog.integration,
                            configurationEntry,
                          ).map((card) => (
                            <div key={card.label}>
                              <span>{card.label}</span>
                              <strong>{card.value}</strong>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="integration-capabilities">
                        <span className="ctrl-section-label">
                          {configurationDialog.integration.setupState ===
                          "available"
                            ? "What this enables"
                            : "Planned capability"}
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
                          <strong>
                            {isInputDevicesSetup
                              ? "Choose device"
                              : "Connection details"}
                          </strong>
                          <span>Saved locally on this machine</span>
                        </div>
                      </div>

                      {!isInputDevicesSetup && (
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
                                      configurationDialog.integration.id ===
                                      "obs"
                                    ) {
                                      setConfigurationObsTestState(null);
                                    }
                                    if (
                                      configurationDialog.integration.id ===
                                      "rotorhazard"
                                    ) {
                                      setConfigurationRotorHazardTestState(
                                        null,
                                      );
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
                      )}

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

                      {configurationDialog.integration.id === "rotorhazard" && (
                        <div className="integration-obs-check">
                          <div className="integration-detail-heading">
                            <div>
                              <strong>RotorHazard Socket.IO check</strong>
                              <span>
                                Confirms Panevo can connect to RotorHazard's
                                live race-state channel.
                              </span>
                            </div>
                          </div>

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={
                              configurationRotorHazardTestState?.status ===
                              "loading"
                            }
                            onClick={testRotorHazardDraft}
                          >
                            <PlugZap />
                            {configurationRotorHazardTestState?.status ===
                            "loading"
                              ? "Testing..."
                              : "Test Socket.IO"}
                          </Button>

                          {configurationRotorHazardTestState && (
                            <div
                              className={`integration-test-result integration-test-result-${configurationRotorHazardTestState.status}`}
                            >
                              <span>
                                {configurationRotorHazardTestState.message}
                              </span>
                              {configurationRotorHazardTestState.socketId && (
                                <small>
                                  Socket.IO session{" "}
                                  {configurationRotorHazardTestState.socketId}
                                </small>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {isInputDevicesSetup && (
                        <DeviceStatusPanel
                          mode="select"
                          selectedDeviceKey={settingsDraft.selectedDeviceKey}
                          onDeviceSelect={selectInputDevice}
                        />
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
                        {isInputDevicesSetup ? (
                          <>
                            <div>
                              <span>Device</span>
                              <strong>
                                {settingsDraft.selectedDeviceName ||
                                  "Not selected"}
                              </strong>
                            </div>
                            <div>
                              <span>Profile</span>
                              <strong>
                                {settingsDraft.inputProfile ||
                                  "Default profile"}
                              </strong>
                            </div>
                          </>
                        ) : (
                          configurationDialog.integration.settings.map(
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
                          )
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

                      {configurationDialog.integration.id === "rotorhazard" && (
                        <div className="integration-dialog-grid">
                          <div>
                            <span>Transport</span>
                            <strong>Socket.IO websocket</strong>
                          </div>
                          <div>
                            <span>Scope</span>
                            <strong>Read-only race state</strong>
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
