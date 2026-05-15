import type {
  KeyboardShortcutActionId,
  KeyboardShortcutBinding,
  KeyboardShortcutConfig,
  KeyboardShortcutGroup,
  PanevoPreferences,
} from "./types";

type ShortcutDefinition = Omit<KeyboardShortcutBinding, "enabled">;

const presetShortcutDefinitions: ShortcutDefinition[] = Array.from(
  { length: 9 },
  (_, index) => {
    const presetNumber = index + 1;

    return {
      id: `preset.${presetNumber}` as KeyboardShortcutActionId,
      label: `Recall preset ${presetNumber}`,
      group: "presets",
      mode: "press",
      keys: [`Alt+Digit${presetNumber}`],
    };
  },
);

export const defaultKeyboardShortcutDefinitions: ShortcutDefinition[] = [
  {
    id: "ptz.tilt-up",
    label: "Tilt up",
    group: "movement",
    mode: "hold",
    keys: ["ArrowUp"],
  },
  {
    id: "ptz.tilt-down",
    label: "Tilt down",
    group: "movement",
    mode: "hold",
    keys: ["ArrowDown"],
  },
  {
    id: "ptz.pan-left",
    label: "Pan left",
    group: "movement",
    mode: "hold",
    keys: ["ArrowLeft"],
  },
  {
    id: "ptz.pan-right",
    label: "Pan right",
    group: "movement",
    mode: "hold",
    keys: ["ArrowRight"],
  },
  {
    id: "ptz.up-left",
    label: "Move up-left",
    group: "movement",
    mode: "hold",
    keys: [],
  },
  {
    id: "ptz.up-right",
    label: "Move up-right",
    group: "movement",
    mode: "hold",
    keys: [],
  },
  {
    id: "ptz.down-left",
    label: "Move down-left",
    group: "movement",
    mode: "hold",
    keys: [],
  },
  {
    id: "ptz.down-right",
    label: "Move down-right",
    group: "movement",
    mode: "hold",
    keys: [],
  },
  {
    id: "zoom.in",
    label: "Zoom in",
    group: "zoom",
    mode: "hold",
    keys: ["KeyE"],
  },
  {
    id: "zoom.out",
    label: "Zoom out",
    group: "zoom",
    mode: "hold",
    keys: ["KeyQ"],
  },
  ...presetShortcutDefinitions,
  {
    id: "stop.all",
    label: "Stop all",
    group: "safety",
    mode: "press",
    keys: ["KeyX"],
  },
];

export const defaultKeyboardShortcutBindings: KeyboardShortcutBinding[] =
  defaultKeyboardShortcutDefinitions.map((definition) => ({
    ...definition,
    enabled: definition.keys.length > 0,
  }));

export const defaultKeyboardShortcutConfig: KeyboardShortcutConfig = {
  enabled: true,
  bindings: defaultKeyboardShortcutBindings,
};

export const defaultPanevoPreferences: PanevoPreferences = {
  keyboardShortcuts: defaultKeyboardShortcutConfig,
};

export const keyboardShortcutGroupLabels: Record<
  KeyboardShortcutGroup,
  string
> = {
  movement: "Movement",
  zoom: "Zoom",
  presets: "Presets",
  safety: "Safety",
};

const keyLabels: Record<string, string> = {
  ArrowUp: "Arrow Up",
  ArrowDown: "Arrow Down",
  ArrowLeft: "Arrow Left",
  ArrowRight: "Arrow Right",
  Space: "Space",
  Escape: "Esc",
  Equal: "+",
  Minus: "-",
  NumpadAdd: "Numpad +",
  NumpadSubtract: "Numpad -",
};

const modifierOrder = ["Ctrl", "Alt", "Shift", "Meta"] as const;

const modifierAliases: Record<string, (typeof modifierOrder)[number]> = {
  Alt: "Alt",
  Control: "Ctrl",
  Ctrl: "Ctrl",
  Meta: "Meta",
  Cmd: "Meta",
  Command: "Meta",
  Shift: "Shift",
};

export const isKeyboardShortcutModifierCode = (code: string): boolean =>
  [
    "AltLeft",
    "AltRight",
    "ControlLeft",
    "ControlRight",
    "MetaLeft",
    "MetaRight",
    "ShiftLeft",
    "ShiftRight",
  ].includes(code);

export const normalizeKeyboardShortcutKey = (key: string): string | null => {
  const parts = key
    .split("+")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return null;
  }

  const code = parts[parts.length - 1];
  if (isKeyboardShortcutModifierCode(code)) {
    return null;
  }

  const modifiers = new Set<(typeof modifierOrder)[number]>();
  for (const part of parts.slice(0, -1)) {
    const modifier = modifierAliases[part];
    if (modifier) {
      modifiers.add(modifier);
    }
  }

  return [...modifierOrder.filter((modifier) => modifiers.has(modifier)), code]
    .join("+")
    .trim();
};

export const hasKeyboardShortcutActivationModifier = (key: string): boolean => {
  const normalized = normalizeKeyboardShortcutKey(key);
  return Boolean(
    normalized &&
    (normalized.split("+").includes("Alt") ||
      normalized.split("+").includes("Ctrl")),
  );
};

export const toKeyboardShortcutKey = (event: {
  altKey: boolean;
  code: string;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
}): string | null => {
  if (isKeyboardShortcutModifierCode(event.code)) {
    return null;
  }

  return normalizeKeyboardShortcutKey(
    [
      event.ctrlKey ? "Ctrl" : null,
      event.altKey ? "Alt" : null,
      event.shiftKey ? "Shift" : null,
      event.metaKey ? "Meta" : null,
      event.code,
    ]
      .filter(Boolean)
      .join("+"),
  );
};

export const formatKeyboardShortcutKey = (code: string): string => {
  const normalized = normalizeKeyboardShortcutKey(code);
  if (normalized && normalized.includes("+")) {
    const parts = normalized.split("+");
    const key = parts[parts.length - 1];
    return [...parts.slice(0, -1), formatKeyboardShortcutKey(key)].join(" + ");
  }

  if (keyLabels[code]) {
    return keyLabels[code];
  }
  if (/^Key[A-Z]$/.test(code)) {
    return code.replace("Key", "");
  }
  if (/^Digit[0-9]$/.test(code)) {
    return code.replace("Digit", "");
  }
  if (/^Numpad[0-9]$/.test(code)) {
    return `Numpad ${code.replace("Numpad", "")}`;
  }

  return code;
};

export const formatKeyboardShortcutKeys = (keys: string[]): string => {
  if (keys.length === 0) {
    return "Unassigned";
  }

  return keys.map(formatKeyboardShortcutKey).join(" / ");
};
