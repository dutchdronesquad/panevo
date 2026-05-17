import { describe, expect, it, vi } from "vitest";
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
import {
  type InputDeviceMappingProfileCollection,
  evaluateInputDeviceMapping,
  normalizeInputDeviceMappingProfile,
} from "@/shared/input-devices";
import type { IntegrationConfigEntry } from "@/shared/types";

const createIntegration = (
  settings: Record<string, unknown>,
): IntegrationConfigEntry => ({
  id: "input-device",
  integrationId: "input-device",
  lifecycleState: "enabled",
  settings,
  updatedAt: "2026-05-17T00:00:00.000Z",
});

describe("input device view model", () => {
  it("converts active pan and tilt input into a diagonal PTZ command", () => {
    const profile = normalizeInputDeviceMappingProfile({
      axes: {
        pan: {
          axis: 0,
          deadzone: 0.1,
          maxSpeed: 10,
        },
        tilt: {
          axis: 1,
          deadzone: 0.1,
          maxSpeed: 12,
        },
      },
      buttons: {
        deadman: { button: 0 },
      },
    });
    const evaluation = evaluateInputDeviceMapping(profile, {
      axes: [1, -1],
      buttons: [1],
      connected: true,
    });

    expect(toPtzCommand(evaluation)).toEqual({
      direction: "up-right",
      panSpeed: 10,
      tiltSpeed: 12,
    });
  });

  it("converts single-axis PTZ input into movement commands", () => {
    const profile = normalizeInputDeviceMappingProfile({
      axes: {
        pan: {
          axis: 0,
          deadzone: 0.1,
          maxSpeed: 10,
        },
        tilt: {
          axis: 1,
          deadzone: 0.1,
          maxSpeed: 12,
        },
      },
      buttons: {
        deadman: { button: 0 },
      },
    });

    expect(
      toPtzCommand(
        evaluateInputDeviceMapping(profile, {
          axes: [-1, 0],
          buttons: [1],
          connected: true,
        }),
      ),
    ).toEqual({
      direction: "pan-left",
      speed: 10,
    });
    expect(
      toPtzCommand(
        evaluateInputDeviceMapping(profile, {
          axes: [0, 1],
          buttons: [1],
          connected: true,
        }),
      ),
    ).toEqual({
      direction: "tilt-down",
      speed: 12,
    });
  });

  it("returns no PTZ command when deadman blocks movement", () => {
    const profile = normalizeInputDeviceMappingProfile({
      axes: {
        pan: {
          axis: 0,
          deadzone: 0.1,
          maxSpeed: 10,
        },
      },
      buttons: {
        deadman: { button: 0 },
      },
    });
    const evaluation = evaluateInputDeviceMapping(profile, {
      axes: [1],
      buttons: [0],
      connected: true,
    });

    expect(evaluation.blockedReason).toBe(
      "Hold deadman to enable mapped movement",
    );
    expect(toPtzCommand(evaluation)).toBeNull();
  });

  it("prefers zoom axis speed over zoom buttons", () => {
    const profile = normalizeInputDeviceMappingProfile({
      axes: {
        zoom: {
          axis: 0,
          deadzone: 0.1,
          maxSpeed: 8,
        },
      },
      buttons: {
        deadman: { button: 0 },
        zoomIn: { button: 1 },
      },
    });
    const evaluation = evaluateInputDeviceMapping(profile, {
      axes: [-1],
      buttons: [1, 1],
      connected: true,
    });

    expect(toZoomCommand(evaluation)).toEqual({
      direction: "out",
      speed: 8,
    });
  });

  it("converts zoom buttons only when input is not blocked", () => {
    const profile = normalizeInputDeviceMappingProfile({
      buttons: {
        deadman: { button: 0 },
        zoomIn: { button: 1 },
        zoomOut: { button: 2 },
      },
    });

    expect(
      toZoomCommand(
        evaluateInputDeviceMapping(profile, {
          axes: [],
          buttons: [0, 1, 1],
          connected: true,
        }),
      ),
    ).toBeNull();
    expect(
      toZoomCommand(
        evaluateInputDeviceMapping(profile, {
          axes: [],
          buttons: [1, 1, 0],
          connected: true,
        }),
      ),
    ).toEqual({
      direction: "in",
      speed: 5,
    });
    expect(
      toZoomCommand(
        evaluateInputDeviceMapping(profile, {
          axes: [],
          buttons: [1, 0, 1],
          connected: true,
        }),
      ),
    ).toEqual({
      direction: "out",
      speed: 5,
    });
  });

  it("creates stable command keys for dispatch deduplication", () => {
    expect(ptzCommandKey(null)).toBe("");
    expect(
      ptzCommandKey({
        direction: "up-left",
        panSpeed: 4,
        tiltSpeed: 8,
      }),
    ).toBe("up-left::4:8");
    expect(zoomCommandKey(null)).toBe("");
    expect(zoomCommandKey({ direction: "in", speed: 5 })).toBe("in:5");
  });

  it("reads trimmed string settings and ignores non-string settings", () => {
    const integration = createIntegration({
      selectedDeviceName: "  Radio joystick  ",
      selectedDeviceIndex: 1,
    });

    expect(getStringSetting(integration, "selectedDeviceName")).toBe(
      "Radio joystick",
    );
    expect(getStringSetting(integration, "selectedDeviceIndex")).toBe("");
  });

  it("uses the configured active profile when it exists", () => {
    const defaultProfile = normalizeInputDeviceMappingProfile({
      id: "default-profile",
      name: "Default",
    });
    const raceProfile = normalizeInputDeviceMappingProfile({
      id: "race-profile",
      name: "Race",
    });
    const integration = createIntegration({
      mappingProfile: defaultProfile,
      mappingProfiles: [defaultProfile, raceProfile],
      activeMappingProfileId: "race-profile",
    });

    const collection = getProfileCollectionFromIntegration(integration);

    expect(collection.activeProfileId).toBe("race-profile");
    expect(getActiveProfile(collection).name).toBe("Race");
  });

  it("keeps the normalized active profile when configured active profile is unknown", () => {
    const defaultProfile = normalizeInputDeviceMappingProfile({
      id: "default-profile",
      name: "Default",
    });
    const integration = createIntegration({
      mappingProfile: defaultProfile,
      mappingProfiles: [defaultProfile],
      activeMappingProfileId: "missing-profile",
    });

    const collection = getProfileCollectionFromIntegration(integration);

    expect(collection.activeProfileId).toBe("default-profile");
  });

  it("falls back to the first available profile when active profile is missing", () => {
    const collection: InputDeviceMappingProfileCollection = {
      activeProfileId: "missing-profile",
      profiles: [
        normalizeInputDeviceMappingProfile({
          id: "fallback-profile",
          name: "Fallback",
        }),
      ],
    };

    expect(getActiveProfile(collection).id).toBe("fallback-profile");
  });

  it("creates timestamp-based profile ids", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-17T12:00:00.000Z"));

    expect(createProfileId()).toBe("profile-1779019200000");

    vi.useRealTimers();
  });
});
