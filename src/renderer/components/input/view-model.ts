import {
  type InputDeviceMappingProfile,
  type InputDeviceMappingProfileCollection,
  evaluateInputDeviceMapping,
  normalizeInputDeviceMappingProfile,
  normalizeInputDeviceMappingProfiles,
} from "@/shared/input-devices";
import type { PanevoPtzDirection } from "@/shared/types";
import type { IntegrationConfigEntry } from "@/renderer/types/camera";

export type InputDeviceEvaluation = ReturnType<
  typeof evaluateInputDeviceMapping
>;

export type ActivePtzCommand = {
  direction: PanevoPtzDirection;
  panSpeed?: number;
  speed?: number;
  tiltSpeed?: number;
};

export type ActiveZoomCommand = {
  direction: "in" | "out";
  speed: number;
};

export const toPtzCommand = (
  evaluation: InputDeviceEvaluation,
): ActivePtzCommand | null => {
  const pan = evaluation.axes.pan;
  const tilt = evaluation.axes.tilt;
  const panDirection =
    pan.active && pan.speed > 0 ? (pan.value < 0 ? "left" : "right") : null;
  const tiltDirection =
    tilt.active && tilt.speed > 0 ? (tilt.value < 0 ? "up" : "down") : null;

  if (!panDirection && !tiltDirection) {
    return null;
  }

  if (panDirection && tiltDirection) {
    const direction = `${tiltDirection}-${panDirection}` as PanevoPtzDirection;
    return {
      direction,
      panSpeed: pan.speed,
      tiltSpeed: tilt.speed,
    };
  }

  if (panDirection) {
    return {
      direction: panDirection === "left" ? "pan-left" : "pan-right",
      speed: pan.speed,
    };
  }

  return {
    direction: tiltDirection === "up" ? "tilt-up" : "tilt-down",
    speed: tilt.speed,
  };
};

export const toZoomCommand = (
  evaluation: InputDeviceEvaluation,
): ActiveZoomCommand | null => {
  const zoom = evaluation.axes.zoom;
  if (zoom.active && zoom.speed > 0) {
    return {
      direction: zoom.value < 0 ? "out" : "in",
      speed: zoom.speed,
    };
  }

  if (evaluation.blockedReason === null && evaluation.buttons.zoomIn.active) {
    return { direction: "in", speed: 5 };
  }

  if (evaluation.blockedReason === null && evaluation.buttons.zoomOut.active) {
    return { direction: "out", speed: 5 };
  }

  return null;
};

export const ptzCommandKey = (command: ActivePtzCommand | null): string =>
  command
    ? [
        command.direction,
        command.speed ?? "",
        command.panSpeed ?? "",
        command.tiltSpeed ?? "",
      ].join(":")
    : "";

export const zoomCommandKey = (command: ActiveZoomCommand | null): string =>
  command ? `${command.direction}:${command.speed}` : "";

export const getStringSetting = (
  integration: IntegrationConfigEntry,
  key: string,
): string => {
  const value = integration.settings[key];
  return typeof value === "string" ? value.trim() : "";
};

export const getProfileFromIntegration = (
  integration: IntegrationConfigEntry,
): InputDeviceMappingProfile =>
  normalizeInputDeviceMappingProfile(integration.settings.mappingProfile);

export const getProfileCollectionFromIntegration = (
  integration: IntegrationConfigEntry,
): InputDeviceMappingProfileCollection => {
  const fallbackProfile = getProfileFromIntegration(integration);
  const collection = normalizeInputDeviceMappingProfiles(
    integration.settings.mappingProfiles,
    fallbackProfile,
  );
  const configuredActiveProfileId = getStringSetting(
    integration,
    "activeMappingProfileId",
  );

  if (
    configuredActiveProfileId &&
    collection.profiles.some(
      (profile) => profile.id === configuredActiveProfileId,
    )
  ) {
    return {
      ...collection,
      activeProfileId: configuredActiveProfileId,
    };
  }

  return collection;
};

export const createProfileId = (): string => `profile-${Date.now()}`;

export const getActiveProfile = (
  collection: InputDeviceMappingProfileCollection,
): InputDeviceMappingProfile =>
  collection.profiles.find(
    (profile) => profile.id === collection.activeProfileId,
  ) ??
  collection.profiles[0] ??
  normalizeInputDeviceMappingProfile(undefined);
