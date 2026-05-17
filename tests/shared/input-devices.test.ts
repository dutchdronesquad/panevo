import { describe, expect, it } from "vitest";
import {
  defaultInputDeviceMappingProfile,
  evaluateInputDeviceMapping,
  formatInputAxisAssignment,
  formatInputButtonAssignment,
  isInputDeviceMappingProfileSafe,
  normalizeInputDeviceMappingProfile,
  normalizeInputDeviceMappingProfiles,
} from "@/shared/input-devices";

describe("input device mapping profiles", () => {
  it("returns defaults for invalid profile data", () => {
    expect(normalizeInputDeviceMappingProfile(null)).toEqual(
      defaultInputDeviceMappingProfile,
    );
  });

  it("normalizes axis and button assignments", () => {
    const profile = normalizeInputDeviceMappingProfile({
      id: " custom ",
      name: " Radio mode 2 ",
      axes: {
        pan: {
          axis: "0",
          deadzone: 2,
          inverted: true,
          maxSpeed: 99,
        },
        tilt: {
          axis: 1,
          deadzone: 0.2,
          maxSpeed: 8,
        },
      },
      buttons: {
        deadman: { button: "4" },
        stop: { button: -1 },
      },
    });

    expect(profile.id).toBe("custom");
    expect(profile.name).toBe("Radio mode 2");
    expect(profile.axes.pan).toEqual({
      axis: 0,
      deadzone: 0.95,
      inverted: true,
      maxSpeed: 24,
    });
    expect(profile.axes.tilt.axis).toBe(1);
    expect(profile.axes.tilt.deadzone).toBe(0.2);
    expect(profile.axes.tilt.maxSpeed).toBe(8);
    expect(profile.buttons.deadman.button).toBe(4);
    expect(profile.buttons.stop.button).toBeNull();
  });

  it("falls back to default numeric axis settings for non-finite values", () => {
    const profile = normalizeInputDeviceMappingProfile({
      axes: {
        zoom: {
          axis: 2,
          deadzone: "invalid",
          maxSpeed: Number.NaN,
        },
      },
    });

    expect(profile.axes.zoom).toEqual({
      axis: 2,
      deadzone: defaultInputDeviceMappingProfile.axes.zoom.deadzone,
      inverted: false,
      maxSpeed: defaultInputDeviceMappingProfile.axes.zoom.maxSpeed,
    });
  });

  it("maps zoom axes as relative speed", () => {
    const profile = normalizeInputDeviceMappingProfile({
      axes: {
        zoom: {
          axis: 1,
          inverted: false,
          deadzone: 0.1,
          maxSpeed: 8,
        },
      },
      buttons: {
        deadman: { button: 0 },
      },
    });

    const evaluation = evaluateInputDeviceMapping(profile, {
      axes: [0, -0.55],
      buttons: [1],
      connected: true,
    });

    expect(evaluation.axes.zoom).toMatchObject({
      active: true,
      speed: 4,
    });
    expect(evaluation.axes.zoom.value).toBeCloseTo(-0.5);
    expect(evaluation.previews).toContain("Zoom out at speed 4");
  });

  it("normalizes profile collections and keeps the active fallback available", () => {
    const fallbackProfile = normalizeInputDeviceMappingProfile({
      id: "radio-mode-2",
      name: "Radio mode 2",
      buttons: {
        deadman: { button: 4 },
      },
    });
    const collection = normalizeInputDeviceMappingProfiles(
      [
        {
          id: "gamepad",
          name: "Gamepad",
        },
        {
          id: "gamepad",
          name: "Duplicate",
        },
      ],
      fallbackProfile,
    );

    expect(collection.activeProfileId).toBe("radio-mode-2");
    expect(collection.profiles.map((profile) => profile.id)).toEqual([
      "radio-mode-2",
      "gamepad",
    ]);
  });

  it("formats assignments for the UI", () => {
    expect(
      formatInputAxisAssignment({
        axis: 2,
        deadzone: 0.1,
        inverted: false,
        maxSpeed: 10,
      }),
    ).toBe("Axis 2");
    expect(formatInputButtonAssignment({ button: 7 })).toBe("Button 7");
    expect(formatInputButtonAssignment({ button: null })).toBe("Not assigned");
  });

  it("requires a deadman button before the profile is considered safe", () => {
    const unsafeProfile = normalizeInputDeviceMappingProfile({});
    const safeProfile = normalizeInputDeviceMappingProfile({
      buttons: {
        deadman: { button: 3 },
      },
    });

    expect(isInputDeviceMappingProfileSafe(unsafeProfile)).toBe(false);
    expect(isInputDeviceMappingProfileSafe(safeProfile)).toBe(true);
  });

  it("blocks mapped movement until the deadman button is active", () => {
    const profile = normalizeInputDeviceMappingProfile({
      axes: {
        pan: {
          axis: 0,
          deadzone: 0.1,
          maxSpeed: 10,
        },
      },
      buttons: {
        deadman: { button: 2 },
      },
    });

    const blocked = evaluateInputDeviceMapping(profile, {
      axes: [0.8],
      buttons: [0, 0, 0],
      connected: true,
    });
    const active = evaluateInputDeviceMapping(profile, {
      axes: [0.8],
      buttons: [0, 0, 1],
      connected: true,
    });

    expect(blocked.blockedReason).toBe(
      "Hold deadman to enable mapped movement",
    );
    expect(blocked.axes.pan.active).toBe(false);
    expect(active.blockedReason).toBeNull();
    expect(active.axes.pan).toMatchObject({
      active: true,
      speed: 8,
    });
    expect(active.previews).toContain("Pan right at speed 8");
  });

  it("keeps stop available while deadman-gated actions stay blocked", () => {
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
        stop: { button: 1 },
        zoomIn: { button: 2 },
        zoomOut: { button: 3 },
      },
    });

    const evaluation = evaluateInputDeviceMapping(profile, {
      axes: [0.8],
      buttons: [0, 1, 1, 1],
      connected: true,
    });

    expect(evaluation.blockedReason).toBe(
      "Hold deadman to enable mapped movement",
    );
    expect(evaluation.axes.pan.active).toBe(false);
    expect(evaluation.buttons.stop.active).toBe(true);
    expect(evaluation.buttons.zoomIn.active).toBe(true);
    expect(evaluation.buttons.zoomOut.active).toBe(true);
    expect(evaluation.previews).toEqual(["Stop all"]);
  });

  it("previews zoom buttons only after deadman is active", () => {
    const profile = normalizeInputDeviceMappingProfile({
      buttons: {
        deadman: { button: 0 },
        zoomIn: { button: 1 },
        zoomOut: { button: 2 },
      },
    });

    const blocked = evaluateInputDeviceMapping(profile, {
      axes: [],
      buttons: [0, 1, 1],
      connected: true,
    });
    const active = evaluateInputDeviceMapping(profile, {
      axes: [],
      buttons: [1, 1, 1],
      connected: true,
    });

    expect(blocked.previews).toEqual([]);
    expect(active.previews).toEqual(["Zoom in button", "Zoom out button"]);
  });

  it("evaluates simultaneous pan and tilt axes", () => {
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
      axes: [-0.55, -1],
      buttons: [1],
      connected: true,
    });

    expect(evaluation.axes.pan).toMatchObject({
      active: true,
      speed: 5,
    });
    expect(evaluation.axes.pan.value).toBeCloseTo(-0.5);
    expect(evaluation.axes.tilt).toMatchObject({
      active: true,
      speed: 12,
      value: -1,
    });
    expect(evaluation.previews).toEqual([
      "Pan left at speed 5",
      "Tilt up at speed 12",
    ]);
  });

  it("applies deadzone, inversion, and stop button previews", () => {
    const profile = normalizeInputDeviceMappingProfile({
      axes: {
        tilt: {
          axis: 1,
          deadzone: 0.2,
          inverted: true,
          maxSpeed: 12,
        },
      },
      buttons: {
        deadman: { button: 0 },
        stop: { button: 1 },
      },
    });

    const evaluation = evaluateInputDeviceMapping(profile, {
      axes: [0, 0.1],
      buttons: [1, 1],
      connected: true,
    });

    expect(evaluation.axes.tilt.active).toBe(false);
    expect(evaluation.previews).toEqual(["Stop all"]);
  });

  it("reports disconnected devices as blocked", () => {
    const profile = normalizeInputDeviceMappingProfile({
      buttons: {
        deadman: { button: 0 },
      },
    });

    const evaluation = evaluateInputDeviceMapping(profile, {
      axes: [],
      buttons: [1],
      connected: false,
    });

    expect(evaluation.blockedReason).toBe("Device disconnected");
    expect(evaluation.deadmanActive).toBe(true);
  });
});
