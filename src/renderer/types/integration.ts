import type { LucideIcon } from "lucide-react";
import {
  Blocks,
  Gamepad2,
  MonitorPlay,
  RadioReceiver,
  Timer,
  Workflow,
} from "lucide-react";
import type { IntegrationLifecycleState } from "../../shared/types";

export type IntegrationCategory =
  | "production"
  | "race"
  | "control-surface"
  | "physical-input"
  | "automation";

export interface IntegrationDefinition {
  id: string;
  name: string;
  category: IntegrationCategory;
  description: string;
  lifecycleState: IntegrationLifecycleState;
  phase: string;
  primaryAction: string;
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
    phase: "Phase 4C",
    primaryAction: "Configure OBS",
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
        helperText: "Stored locally in panevo-integrations.json for now.",
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
    phase: "Phase 4F",
    primaryAction: "Configure RotorHazard",
    testActionLabel: "Test RotorHazard",
    settings: [
      {
        key: "baseUrl",
        label: "RotorHazard URL",
        type: "url",
        placeholder: "http://rotorhazard.local",
        required: true,
      },
      {
        key: "apiKey",
        label: "API key",
        type: "password",
        helperText: "Only needed when the RotorHazard setup requires it.",
      },
    ],
    capabilities: [
      "Read race lifecycle state",
      "Map pilots and lanes to production actions",
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
    phase: "Phase 4D",
    primaryAction: "Configure bridge",
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
    id: "physical-controls",
    name: "Physical Controls",
    category: "physical-input",
    description:
      "Operator input from gamepads, HID devices, MIDI controls, keyboard shortcuts, or radio-style controllers.",
    lifecycleState: "not-configured",
    phase: "Phase 4E",
    primaryAction: "Configure input",
    testActionLabel: "Test input",
    settings: [
      {
        key: "inputProfile",
        label: "Input profile",
        type: "text",
        placeholder: "Gamepad, MIDI, HID, keyboard",
        required: true,
      },
      {
        key: "deadmanAction",
        label: "Deadman action",
        type: "text",
        placeholder: "Hold assigned button before movement",
      },
    ],
    capabilities: [
      "Map axes to pan and tilt",
      "Map buttons to presets, zoom, and stop",
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
    phase: "Phase 4G",
    primaryAction: "Investigate Flexbar",
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
  {
    id: "automation",
    name: "Automation Rules",
    category: "automation",
    description:
      "Guarded trigger/action rules that connect race, production, control-surface, and camera events.",
    lifecycleState: "disabled",
    phase: "Phase 4H",
    primaryAction: "Configure rules",
    testActionLabel: "Validate rules",
    settings: [
      {
        key: "ruleSetName",
        label: "Rule set name",
        type: "text",
        defaultValue: "Default rules",
        required: true,
      },
      {
        key: "safetyMode",
        label: "Safety mode",
        type: "text",
        defaultValue: "Manual review before automation",
      },
    ],
    capabilities: [
      "Trigger through normalized Panevo events",
      "Run actions through the shared dispatcher",
      "Always let emergency stop override automation",
    ],
    icon: Workflow,
  },
];
