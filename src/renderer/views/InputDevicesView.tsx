import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Gamepad2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/renderer/components/ui/button";
import {
  MappingEditor,
  type MappingCaptureTarget,
} from "@/renderer/components/input/MappingEditor";
import { DeviceMonitorCard } from "@/renderer/components/input/DeviceMonitorCard";
import { DeviceOverviewCard } from "@/renderer/components/input/DeviceOverviewCard";
import { MappingProfileCard } from "@/renderer/components/input/MappingProfileCard";
import {
  createProfileId,
  getActiveProfile,
  getProfileCollectionFromIntegration,
  getStringSetting,
  ptzCommandKey,
  toPtzCommand,
  toZoomCommand,
  zoomCommandKey,
} from "@/renderer/components/input/view-model";
import { useGamepadDevices } from "@/renderer/hooks/useGamepadDevices";
import {
  type InputAxisAction,
  type InputButtonAction,
  type InputDeviceMappingProfile,
  defaultInputDeviceMappingProfile,
  evaluateInputDeviceMapping,
  isInputDeviceMappingProfileSafe,
  normalizeInputDeviceMappingProfiles,
} from "@/shared/input-devices";
import type { PanevoAction } from "@/shared/types";
import type { IntegrationConfigEntry } from "@/renderer/types/camera";

interface InputDevicesViewProps {
  integration?: IntegrationConfigEntry;
  onOpenIntegrations: () => void;
  onSaveIntegration: (integration: IntegrationConfigEntry) => Promise<boolean>;
}

export const InputDevicesView = ({
  integration,
  onOpenIntegrations,
  onSaveIntegration,
}: InputDevicesViewProps) => {
  const {
    connectedCount,
    devices,
    refresh: refreshDevices,
    supported,
  } = useGamepadDevices();
  const initialProfileCollection = useMemo(
    () =>
      integration
        ? getProfileCollectionFromIntegration(integration)
        : normalizeInputDeviceMappingProfiles(undefined),
    [integration],
  );
  const [profiles, setProfiles] = useState<InputDeviceMappingProfile[]>(
    () => initialProfileCollection.profiles,
  );
  const [activeProfileId, setActiveProfileId] = useState(
    initialProfileCollection.activeProfileId,
  );
  const [profile, setProfile] = useState<InputDeviceMappingProfile>(() =>
    getActiveProfile(initialProfileCollection),
  );
  const [captureTarget, setCaptureTarget] =
    useState<MappingCaptureTarget | null>(null);
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [liveControlStatus, setLiveControlStatus] = useState(
    "Hold deadman to control camera",
  );
  const captureBaselineRef = useRef<{
    axes: number[];
    buttons: number[];
  } | null>(null);
  const activePtzCommandRef = useRef("");
  const activeZoomCommandRef = useRef("");
  const stopButtonActiveRef = useRef(false);

  useEffect(() => {
    if (integration) {
      const nextProfileCollection =
        getProfileCollectionFromIntegration(integration);
      setProfiles(nextProfileCollection.profiles);
      setActiveProfileId(nextProfileCollection.activeProfileId);
      setProfile(getActiveProfile(nextProfileCollection));
      setCaptureTarget(null);
      captureBaselineRef.current = null;
      setSaveState("idle");
      setLiveControlStatus("Hold deadman to control camera");
    }
  }, [integration]);

  const selectedDeviceKey = integration
    ? getStringSetting(integration, "selectedDeviceKey")
    : "";
  const selectedDevice = useMemo(
    () => devices.find((device) => device.key === selectedDeviceKey),
    [devices, selectedDeviceKey],
  );
  const evaluation = useMemo(
    () =>
      evaluateInputDeviceMapping(profile, {
        axes: selectedDevice?.axisValues ?? [],
        buttons: selectedDevice?.buttonValues ?? [],
        connected: selectedDevice?.connected ?? false,
      }),
    [profile, selectedDevice],
  );

  useEffect(() => {
    if (!captureTarget || !selectedDevice || !captureBaselineRef.current) {
      return;
    }

    const baseline = captureBaselineRef.current;

    if (captureTarget.kind === "axis") {
      const axisCandidate = selectedDevice.axisValues
        .map((value, index) => ({
          index,
          movement: Math.abs(value - (baseline.axes[index] ?? 0)),
          value,
        }))
        .sort((a, b) => b.movement - a.movement)[0];

      if (
        axisCandidate &&
        (axisCandidate.movement >= 0.35 || Math.abs(axisCandidate.value) >= 0.7)
      ) {
        setProfile((currentProfile) => ({
          ...currentProfile,
          axes: {
            ...currentProfile.axes,
            [captureTarget.action]: {
              ...currentProfile.axes[captureTarget.action],
              axis: axisCandidate.index,
            },
          },
        }));
        setSaveState("idle");
        setCaptureTarget(null);
        captureBaselineRef.current = null;
      }
      return;
    }

    const buttonCandidate = selectedDevice.buttonValues.findIndex(
      (value, index) => value > 0.5 && (baseline.buttons[index] ?? 0) <= 0.1,
    );

    if (buttonCandidate >= 0) {
      setProfile((currentProfile) => ({
        ...currentProfile,
        buttons: {
          ...currentProfile.buttons,
          [captureTarget.action]: {
            button: buttonCandidate,
          },
        },
      }));
      setSaveState("idle");
      setCaptureTarget(null);
      captureBaselineRef.current = null;
    }
  }, [captureTarget, selectedDevice]);

  const selectedDeviceName =
    integration && getStringSetting(integration, "selectedDeviceName")
      ? getStringSetting(integration, "selectedDeviceName")
      : "Selected device";
  const profileIsSafe = isInputDeviceMappingProfileSafe(profile);

  const dispatchInputAction = useCallback(async (action: PanevoAction) => {
    const result = await window.panevo.dispatchAction({
      ...action,
      source: "operator",
    });

    if (!result.ok) {
      setLiveControlStatus(`${result.error.code}: ${result.error.message}`);
      return false;
    }

    setLiveControlStatus(result.data.message);
    return true;
  }, []);

  const stopActiveInputControl = useCallback(() => {
    if (activePtzCommandRef.current) {
      activePtzCommandRef.current = "";
      void dispatchInputAction({ type: "camera.stop", target: "movement" });
    }

    if (activeZoomCommandRef.current) {
      activeZoomCommandRef.current = "";
      void dispatchInputAction({ type: "camera.stop", target: "zoom" });
    }
  }, [dispatchInputAction]);

  useEffect(() => {
    if (!profileIsSafe) {
      stopActiveInputControl();
      setLiveControlStatus("Configure deadman before camera control");
      return;
    }

    if (evaluation.buttons.stop.active) {
      if (!stopButtonActiveRef.current) {
        stopButtonActiveRef.current = true;
        activePtzCommandRef.current = "";
        activeZoomCommandRef.current = "";
        void dispatchInputAction({ type: "camera.stop", target: "all" });
      }
      return;
    }
    stopButtonActiveRef.current = false;

    if (evaluation.blockedReason) {
      stopActiveInputControl();
      setLiveControlStatus(evaluation.blockedReason);
      return;
    }

    const ptzCommand = toPtzCommand(evaluation);
    const nextPtzKey = ptzCommandKey(ptzCommand);
    if (nextPtzKey !== activePtzCommandRef.current) {
      activePtzCommandRef.current = nextPtzKey;
      if (!ptzCommand) {
        void dispatchInputAction({
          type: "camera.stop",
          target: "movement",
        });
      } else {
        void dispatchInputAction({
          type: "camera.ptz.move",
          direction: ptzCommand.direction,
          speed: ptzCommand.speed,
          panSpeed: ptzCommand.panSpeed,
          tiltSpeed: ptzCommand.tiltSpeed,
        });
      }
    }

    const zoomCommand = toZoomCommand(evaluation);
    const nextZoomKey = zoomCommandKey(zoomCommand);
    if (nextZoomKey !== activeZoomCommandRef.current) {
      activeZoomCommandRef.current = nextZoomKey;
      if (!zoomCommand) {
        void dispatchInputAction({ type: "camera.stop", target: "zoom" });
      } else {
        void dispatchInputAction({
          type: "camera.zoom.move",
          direction: zoomCommand.direction,
          speed: zoomCommand.speed,
        });
      }
    }
  }, [dispatchInputAction, evaluation, profileIsSafe, stopActiveInputControl]);

  useEffect(() => {
    const stopOnPageExit = () => {
      stopActiveInputControl();
    };
    const onVisibilityChange = () => {
      if (document.hidden) {
        stopOnPageExit();
      }
    };

    window.addEventListener("blur", stopOnPageExit);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("blur", stopOnPageExit);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      stopActiveInputControl();
    };
  }, [stopActiveInputControl]);

  if (!integration) {
    return (
      <main className="input-devices-view">
        <section className="input-devices-empty">
          <div className="control-empty-icon">
            <Gamepad2 size={22} />
          </div>
          <div className="control-empty-copy">
            <h3>No input device configured</h3>
            <p>
              Add Input Device from Integrations before configuring mappings.
            </p>
          </div>
          <Button type="button" onClick={onOpenIntegrations}>
            Open integrations
          </Button>
        </section>
      </main>
    );
  }

  const startCapture = (target: MappingCaptureTarget) => {
    if (!selectedDevice) {
      return;
    }

    captureBaselineRef.current = {
      axes: selectedDevice.axisValues,
      buttons: selectedDevice.buttonValues,
    };
    setCaptureTarget(target);
  };

  const updateAxis = (
    action: InputAxisAction,
    updates: Partial<InputDeviceMappingProfile["axes"][InputAxisAction]>,
  ) => {
    setProfile((currentProfile) => ({
      ...currentProfile,
      axes: {
        ...currentProfile.axes,
        [action]: {
          ...currentProfile.axes[action],
          ...updates,
        },
      },
    }));
    setSaveState("idle");
  };

  const updateButton = (action: InputButtonAction, button: number | null) => {
    setProfile((currentProfile) => ({
      ...currentProfile,
      buttons: {
        ...currentProfile.buttons,
        [action]: {
          button,
        },
      },
    }));
    setSaveState("idle");
  };

  const saveProfile = () => {
    void (async () => {
      setSaveState("saving");
      const nextProfiles = profiles.some((item) => item.id === profile.id)
        ? profiles.map((item) => (item.id === profile.id ? profile : item))
        : [...profiles, profile];
      const saved = await onSaveIntegration({
        ...integration,
        settings: {
          ...integration.settings,
          inputProfile: profile.name,
          activeMappingProfileId: profile.id,
          mappingProfile: profile,
          mappingProfiles: nextProfiles,
        },
        updatedAt: new Date().toISOString(),
      });
      setSaveState(saved ? "saved" : "error");
      if (saved) {
        setProfiles(nextProfiles);
        setActiveProfileId(profile.id);
        toast.success("Input profile saved");
      } else {
        toast.error("Input profile could not be saved");
      }
    })();
  };

  const activateProfile = (profileId: string) => {
    const nextProfile = profiles.find((item) => item.id === profileId);
    if (!nextProfile) {
      return;
    }

    stopActiveInputControl();
    setActiveProfileId(profileId);
    setProfile(nextProfile);
    setSaveState("idle");
    setLiveControlStatus("Hold deadman to control camera");
  };

  const createProfile = () => {
    stopActiveInputControl();
    const nextProfile = {
      ...structuredClone(defaultInputDeviceMappingProfile),
      id: createProfileId(),
      name: "New profile",
    };

    setProfiles((currentProfiles) => [...currentProfiles, nextProfile]);
    setActiveProfileId(nextProfile.id);
    setProfile(nextProfile);
    setSaveState("idle");
  };

  const deleteActiveProfile = () => {
    void (async () => {
      stopActiveInputControl();
      const remainingProfiles = profiles.filter(
        (item) => item.id !== activeProfileId,
      );
      const nextProfiles =
        remainingProfiles.length > 0
          ? remainingProfiles
          : [
              {
                ...structuredClone(defaultInputDeviceMappingProfile),
                id: createProfileId(),
              },
            ];
      const nextProfile = nextProfiles[0];
      setSaveState("saving");
      const saved = await onSaveIntegration({
        ...integration,
        settings: {
          ...integration.settings,
          inputProfile: nextProfile.name,
          activeMappingProfileId: nextProfile.id,
          mappingProfile: nextProfile,
          mappingProfiles: nextProfiles,
        },
        updatedAt: new Date().toISOString(),
      });

      if (saved) {
        setProfiles(nextProfiles);
        setActiveProfileId(nextProfile.id);
        setProfile(nextProfile);
        setSaveState("saved");
        toast.success("Input profile deleted");
      } else {
        setSaveState("error");
        toast.error("Input profile could not be deleted");
      }
    })();
  };

  return (
    <main className="input-devices-view">
      <DeviceOverviewCard
        deadmanActive={evaluation.deadmanActive}
        liveControlStatus={liveControlStatus}
        profileIsSafe={profileIsSafe}
        profileName={profile.name}
        selectedDeviceName={selectedDeviceName}
      />

      <MappingProfileCard
        activeProfileId={activeProfileId}
        onActivateProfile={activateProfile}
        onCreateProfile={createProfile}
        onDeleteProfile={deleteActiveProfile}
        onProfileNameChange={(name) => {
          setProfile((currentProfile) => ({
            ...currentProfile,
            name,
          }));
          setSaveState("idle");
        }}
        onSaveProfile={saveProfile}
        profile={profile}
        profileIsSafe={profileIsSafe}
        profiles={profiles}
        saveState={saveState}
      />

      <MappingEditor
        captureTarget={captureTarget}
        onCaptureStart={startCapture}
        onUpdateAxis={updateAxis}
        onUpdateButton={updateButton}
        profile={profile}
        selectedDeviceAvailable={Boolean(selectedDevice)}
      />

      <DeviceMonitorCard
        connectedCount={connectedCount}
        onRefresh={refreshDevices}
        selectedDeviceKey={selectedDeviceKey}
        supported={supported}
      />
    </main>
  );
};
