import type { LucideIcon } from "lucide-react";
import {
  Blocks,
  Gamepad2,
  MonitorPlay,
  RadioReceiver,
  Timer,
} from "lucide-react";
import type { IntegrationLifecycleState } from "@/shared/types";

export type IntegrationCategory =
  | "production"
  | "race"
  | "control-surface"
  | "input-device";

export interface IntegrationDefinition {
  id: string;
  name: string;
  category: IntegrationCategory;
  description: string;
  lifecycleState: IntegrationLifecycleState;
  primaryAction: string;
  setupState: "available" | "planned";
  testActionLabel: string;
  settings: IntegrationSettingDefinition[];
  capabilities: string[];
  icon: LucideIcon;
}

export interface IntegrationSettingDefinition {
  key: string;
  label: string;
  type: "text" | "url" | "number" | "password";
  placeholder?: string;
  defaultValue?: string;
  required?: boolean;
  helperText?: string;
}

export const integrationLifecycleLabels: Record<
  IntegrationLifecycleState,
  string
> = {
  "not-configured": "Not configured",
  configured: "Configured",
  enabled: "Enabled",
  connected: "Connected",
  error: "Error",
  disabled: "Disabled",
};

export const integrationLifecycleChipClass: Record<
  IntegrationLifecycleState,
  string
> = {
  "not-configured": "chip-info",
  configured: "chip-standby",
  enabled: "chip-standby",
  connected: "chip-live",
  error: "chip-error",
  disabled: "chip-info",
};

export const integrationRegistry: IntegrationDefinition[] = [
  {
    id: "obs",
    name: "OBS",
    category: "production",
    description:
      "Scene switching and live production state from an OBS websocket connection.",
    lifecycleState: "not-configured",
    primaryAction: "Configure OBS",
    setupState: "available",
    testActionLabel: "Test OBS",
    settings: [
      {
        key: "host",
        label: "OBS host",
        type: "text",
        defaultValue: "127.0.0.1",
        required: true,
      },
      {
        key: "port",
        label: "WebSocket port",
        type: "number",
        defaultValue: "4455",
        required: true,
      },
      {
        key: "password",
        label: "WebSocket password",
        type: "password",
        helperText: "Saved locally on this machine.",
      },
    ],
    capabilities: [
      "Read scene list",
      "Switch scenes through Panevo actions",
      "Expose connection state to operators",
    ],
    icon: MonitorPlay,
  },
  {
    id: "rotorhazard",
    name: "RotorHazard",
    category: "race",
    description:
      "Race timing, active heat, pilot, lane, and race-state events for race-aware production.",
    lifecycleState: "not-configured",
    primaryAction: "Configure RotorHazard",
    setupState: "available",
    testActionLabel: "Test RotorHazard",
    settings: [
      {
        key: "host",
        label: "RotorHazard host",
        type: "text",
        placeholder: "192.168.1.20",
        required: true,
      },
      {
        key: "port",
        label: "RotorHazard port",
        type: "number",
        defaultValue: "5000",
        required: true,
      },
    ],
    capabilities: [
      "Connect through RotorHazard Socket.IO",
      "Normalize race state for future automation",
      "Pause automation when race state becomes stale",
    ],
    icon: Timer,
  },
  {
    id: "companion-streamdeck",
    name: "Companion / Stream Deck",
    category: "control-surface",
    description:
      "External button surfaces for safe camera actions, preset recall, and emergency stop.",
    lifecycleState: "not-configured",
    primaryAction: "Configure bridge",
    setupState: "planned",
    testActionLabel: "Test bridge",
    settings: [
      {
        key: "bridgeUrl",
        label: "Bridge URL",
        type: "url",
        placeholder: "http://127.0.0.1:8000",
        required: true,
      },
      {
        key: "surfaceName",
        label: "Surface name",
        type: "text",
        defaultValue: "Production buttons",
      },
    ],
    capabilities: [
      "Trigger active-camera actions",
      "Expose camera and connection feedback",
      "Keep external triggers behind safety checks",
    ],
    icon: Blocks,
  },
  {
    id: "input-devices",
    name: "Input Device",
    category: "input-device",
    description:
      "Operator input from gamepads, HID devices, MIDI controls, or radio-style controllers.",
    lifecycleState: "not-configured",
    primaryAction: "Configure input",
    setupState: "available",
    testActionLabel: "Test input",
    settings: [
      {
        key: "selectedDeviceKey",
        label: "Device",
        type: "text",
        placeholder: "No device selected",
        required: true,
      },
      {
        key: "selectedDeviceName",
        label: "Device name",
        type: "text",
        placeholder: "Standard gamepad / joystick",
      },
      {
        key: "inputProfile",
        label: "Input profile",
        type: "text",
        defaultValue: "Default profile",
        placeholder: "Default profile",
      },
    ],
    capabilities: [
      "Map axes to pan, tilt, and zoom",
      "Map buttons to zoom and stop",
      "Require deadman input before movement",
    ],
    icon: Gamepad2,
  },
  {
    id: "flexbar",
    name: "Flexbar",
    category: "control-surface",
    description:
      "Compact touch-panel actions and feedback for camera, preset, OBS, and race cues.",
    lifecycleState: "not-configured",
    primaryAction: "Investigate Flexbar",
    setupState: "planned",
    testActionLabel: "Validate Flexbar",
    settings: [
      {
        key: "deviceName",
        label: "Device name",
        type: "text",
        defaultValue: "Flexbar",
        required: true,
      },
      {
        key: "bridgeMode",
        label: "Bridge mode",
        type: "text",
        placeholder: "SDK, local bridge, or generic trigger path",
      },
    ],
    capabilities: [
      "Confirm available SDK or bridge",
      "Design compact action layout",
      "Avoid Flexbar-specific core concepts",
    ],
    icon: RadioReceiver,
  },
];
