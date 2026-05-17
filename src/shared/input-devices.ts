export type InputAxisAction = "pan" | "tilt" | "zoom";

export type InputButtonAction = "deadman" | "stop" | "zoomIn" | "zoomOut";

export interface InputAxisMapping {
  axis: number | null;
  deadzone: number;
  inverted: boolean;
  maxSpeed: number;
}

export interface InputButtonMapping {
  button: number | null;
}

export interface InputDeviceMappingProfile {
  id: string;
  name: string;
  axes: Record<InputAxisAction, InputAxisMapping>;
  buttons: Record<InputButtonAction, InputButtonMapping>;
}

export interface InputDeviceMappingProfileCollection {
  activeProfileId: string;
  profiles: InputDeviceMappingProfile[];
}

export interface InputDeviceInputSnapshot {
  axes: number[];
  buttons: number[];
  connected: boolean;
}

export interface InputAxisIntent {
  action: InputAxisAction;
  assigned: boolean;
  rawValue: number;
  value: number;
  speed: number;
  active: boolean;
}

export interface InputButtonIntent {
  action: InputButtonAction;
  assigned: boolean;
  active: boolean;
}

export interface InputDeviceEvaluation {
  connected: boolean;
  deadmanConfigured: boolean;
  deadmanActive: boolean;
  blockedReason: string | null;
  axes: Record<InputAxisAction, InputAxisIntent>;
  buttons: Record<InputButtonAction, InputButtonIntent>;
  previews: string[];
}

const DEFAULT_AXIS_MAPPING: InputAxisMapping = {
  axis: null,
  deadzone: 0.12,
  inverted: false,
  maxSpeed: 10,
};

const DEFAULT_BUTTON_MAPPING: InputButtonMapping = {
  button: null,
};

export const defaultInputDeviceMappingProfile: InputDeviceMappingProfile = {
  id: "default",
  name: "Default profile",
  axes: {
    pan: { ...DEFAULT_AXIS_MAPPING },
    tilt: { ...DEFAULT_AXIS_MAPPING },
    zoom: { ...DEFAULT_AXIS_MAPPING, maxSpeed: 5 },
  },
  buttons: {
    deadman: { ...DEFAULT_BUTTON_MAPPING },
    stop: { ...DEFAULT_BUTTON_MAPPING },
    zoomIn: { ...DEFAULT_BUTTON_MAPPING },
    zoomOut: { ...DEFAULT_BUTTON_MAPPING },
  },
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const normalizeNullableIndex = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numericValue = Number(value);
  return Number.isInteger(numericValue) && numericValue >= 0
    ? numericValue
    : null;
};

const normalizeBoundedNumber = (
  value: unknown,
  fallback: number,
  min: number,
  max: number,
): number => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, numericValue));
};

const normalizeAxisMapping = (
  value: unknown,
  fallback: InputAxisMapping,
): InputAxisMapping => {
  if (!isRecord(value)) {
    return { ...fallback };
  }

  return {
    axis: normalizeNullableIndex(value.axis),
    deadzone: normalizeBoundedNumber(
      value.deadzone,
      fallback.deadzone,
      0,
      0.95,
    ),
    inverted: value.inverted === true,
    maxSpeed: normalizeBoundedNumber(value.maxSpeed, fallback.maxSpeed, 1, 24),
  };
};

const normalizeButtonMapping = (value: unknown): InputButtonMapping => {
  if (!isRecord(value)) {
    return { ...DEFAULT_BUTTON_MAPPING };
  }

  return {
    button: normalizeNullableIndex(value.button),
  };
};

export const normalizeInputDeviceMappingProfile = (
  value: unknown,
): InputDeviceMappingProfile => {
  if (!isRecord(value)) {
    return structuredClone(defaultInputDeviceMappingProfile);
  }

  const axes = isRecord(value.axes) ? value.axes : {};
  const buttons = isRecord(value.buttons) ? value.buttons : {};

  return {
    id:
      typeof value.id === "string" && value.id.trim().length > 0
        ? value.id.trim().slice(0, 80)
        : defaultInputDeviceMappingProfile.id,
    name:
      typeof value.name === "string" && value.name.trim().length > 0
        ? value.name.trim().slice(0, 80)
        : defaultInputDeviceMappingProfile.name,
    axes: {
      pan: normalizeAxisMapping(
        axes.pan,
        defaultInputDeviceMappingProfile.axes.pan,
      ),
      tilt: normalizeAxisMapping(
        axes.tilt,
        defaultInputDeviceMappingProfile.axes.tilt,
      ),
      zoom: normalizeAxisMapping(
        axes.zoom,
        defaultInputDeviceMappingProfile.axes.zoom,
      ),
    },
    buttons: {
      deadman: normalizeButtonMapping(buttons.deadman),
      stop: normalizeButtonMapping(buttons.stop),
      zoomIn: normalizeButtonMapping(buttons.zoomIn),
      zoomOut: normalizeButtonMapping(buttons.zoomOut),
    },
  };
};

export const normalizeInputDeviceMappingProfiles = (
  value: unknown,
  fallbackProfile: InputDeviceMappingProfile = defaultInputDeviceMappingProfile,
): InputDeviceMappingProfileCollection => {
  const rawProfiles = Array.isArray(value) ? value : [];
  const profiles = rawProfiles
    .map((profile) => normalizeInputDeviceMappingProfile(profile))
    .filter(
      (profile, index, collection) =>
        collection.findIndex((item) => item.id === profile.id) === index,
    );

  if (!profiles.some((profile) => profile.id === fallbackProfile.id)) {
    profiles.unshift(fallbackProfile);
  }

  const activeProfileId = fallbackProfile.id;

  return {
    activeProfileId,
    profiles,
  };
};

export const formatInputAxisAssignment = (mapping: InputAxisMapping): string =>
  mapping.axis === null ? "Not assigned" : `Axis ${mapping.axis}`;

export const formatInputButtonAssignment = (
  mapping: InputButtonMapping,
): string =>
  mapping.button === null ? "Not assigned" : `Button ${mapping.button}`;

export const isInputDeviceMappingProfileSafe = (
  profile: InputDeviceMappingProfile,
): boolean => profile.buttons.deadman.button !== null;

const getAxisValue = (
  snapshot: InputDeviceInputSnapshot,
  mapping: InputAxisMapping,
): number => {
  if (mapping.axis === null) {
    return 0;
  }

  return snapshot.axes[mapping.axis] ?? 0;
};

const applyDeadzone = (value: number, deadzone: number): number => {
  const absoluteValue = Math.abs(value);
  if (absoluteValue <= deadzone) {
    return 0;
  }

  const scaledValue = (absoluteValue - deadzone) / (1 - deadzone);
  return Math.sign(value) * Math.min(1, scaledValue);
};

const isButtonActive = (
  snapshot: InputDeviceInputSnapshot,
  mapping: InputButtonMapping,
): boolean =>
  mapping.button !== null && (snapshot.buttons[mapping.button] ?? 0) > 0.5;

const formatAxisPreview = (
  action: InputAxisAction,
  intent: InputAxisIntent,
): string | null => {
  if (!intent.active) {
    return null;
  }

  if (action === "pan") {
    return `${intent.value < 0 ? "Pan left" : "Pan right"} at speed ${intent.speed}`;
  }

  if (action === "tilt") {
    return `${intent.value < 0 ? "Tilt up" : "Tilt down"} at speed ${intent.speed}`;
  }

  return `${intent.value < 0 ? "Zoom out" : "Zoom in"} at speed ${intent.speed}`;
};

export const evaluateInputDeviceMapping = (
  profile: InputDeviceMappingProfile,
  snapshot: InputDeviceInputSnapshot,
): InputDeviceEvaluation => {
  const deadmanConfigured = profile.buttons.deadman.button !== null;
  const deadmanActive = isButtonActive(snapshot, profile.buttons.deadman);
  const blockedReason = !snapshot.connected
    ? "Device disconnected"
    : !deadmanConfigured
      ? "Deadman is not assigned"
      : !deadmanActive
        ? "Hold deadman to enable mapped movement"
        : null;

  const buttons: Record<InputButtonAction, InputButtonIntent> = {
    deadman: {
      action: "deadman",
      assigned: profile.buttons.deadman.button !== null,
      active: deadmanActive,
    },
    stop: {
      action: "stop",
      assigned: profile.buttons.stop.button !== null,
      active: isButtonActive(snapshot, profile.buttons.stop),
    },
    zoomIn: {
      action: "zoomIn",
      assigned: profile.buttons.zoomIn.button !== null,
      active: isButtonActive(snapshot, profile.buttons.zoomIn),
    },
    zoomOut: {
      action: "zoomOut",
      assigned: profile.buttons.zoomOut.button !== null,
      active: isButtonActive(snapshot, profile.buttons.zoomOut),
    },
  };

  const axes = Object.fromEntries(
    (["pan", "tilt", "zoom"] as InputAxisAction[]).map((action) => {
      const mapping = profile.axes[action];
      const rawValue = getAxisValue(snapshot, mapping);
      const mappedValue = mapping.inverted ? rawValue * -1 : rawValue;
      const value = applyDeadzone(mappedValue, mapping.deadzone);
      const speed =
        value === 0
          ? 0
          : Math.max(1, Math.round(Math.abs(value) * mapping.maxSpeed));

      return [
        action,
        {
          action,
          assigned: mapping.axis !== null,
          rawValue,
          value,
          speed,
          active: blockedReason === null && mapping.axis !== null && speed > 0,
        },
      ];
    }),
  ) as Record<InputAxisAction, InputAxisIntent>;

  const axisPreviews = (["pan", "tilt", "zoom"] as InputAxisAction[])
    .map((action) => formatAxisPreview(action, axes[action]))
    .filter((preview): preview is string => Boolean(preview));
  const buttonPreviews = [
    buttons.stop.active ? "Stop all" : null,
    blockedReason === null && buttons.zoomIn.active ? "Zoom in button" : null,
    blockedReason === null && buttons.zoomOut.active ? "Zoom out button" : null,
  ].filter((preview): preview is string => Boolean(preview));

  return {
    connected: snapshot.connected,
    deadmanConfigured,
    deadmanActive,
    blockedReason,
    axes,
    buttons,
    previews: [...axisPreviews, ...buttonPreviews],
  };
};
