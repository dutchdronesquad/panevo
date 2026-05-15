import { globalShortcut } from "electron";
import {
  hasKeyboardShortcutActivationModifier,
  normalizeKeyboardShortcutKey,
} from "@/shared/keyboard-shortcuts";
import type {
  KeyboardShortcutBinding,
  PanevoPreferences,
} from "@/shared/types";
import { getActionDispatcher } from "../actions/action-dispatcher-instance";
import type { PreferencesService } from "../preferences/preferences-service";
import { getPreferencesService } from "../preferences/preferences-service-instance";

type ShortcutRegistrar = Pick<
  typeof globalShortcut,
  "register" | "unregister" | "unregisterAll"
>;

type ShortcutDispatcher = Pick<
  ReturnType<typeof getActionDispatcher>,
  "dispatch"
>;

type PreferencesReader = Pick<PreferencesService, "getPreferences">;

interface GlobalShortcutServiceDependencies {
  dispatcher?: ShortcutDispatcher;
  preferencesService?: PreferencesReader;
  registrar?: ShortcutRegistrar;
}

const presetNumbersById: Partial<
  Record<KeyboardShortcutBinding["id"], number>
> = {
  "preset.1": 1,
  "preset.2": 2,
  "preset.3": 3,
  "preset.4": 4,
  "preset.5": 5,
  "preset.6": 6,
  "preset.7": 7,
  "preset.8": 8,
  "preset.9": 9,
};

const keyCodeToAcceleratorKey = (code: string): string | null => {
  if (/^Key[A-Z]$/.test(code)) {
    return code.replace("Key", "");
  }
  if (/^Digit[0-9]$/.test(code)) {
    return code.replace("Digit", "");
  }
  if (/^F([1-9]|1[0-9]|2[0-4])$/.test(code)) {
    return code;
  }

  const keyMap: Record<string, string> = {
    ArrowDown: "Down",
    ArrowLeft: "Left",
    ArrowRight: "Right",
    ArrowUp: "Up",
    Backspace: "Backspace",
    Comma: ",",
    Delete: "Delete",
    End: "End",
    Enter: "Enter",
    Equal: "=",
    Escape: "Esc",
    Home: "Home",
    Insert: "Insert",
    Minus: "-",
    PageDown: "PageDown",
    PageUp: "PageUp",
    Period: ".",
    Slash: "/",
    Space: "Space",
    Tab: "Tab",
  };

  return keyMap[code] ?? null;
};

export const keyboardShortcutKeyToAccelerator = (
  key: string,
): string | null => {
  const normalizedKey = normalizeKeyboardShortcutKey(key);
  if (!normalizedKey || !hasKeyboardShortcutActivationModifier(normalizedKey)) {
    return null;
  }

  const parts = normalizedKey.split("+");
  if (parts.includes("Meta")) {
    return null;
  }

  const code = parts[parts.length - 1];
  const acceleratorKey = keyCodeToAcceleratorKey(code);
  if (!acceleratorKey) {
    return null;
  }

  return [...parts.slice(0, -1), acceleratorKey].join("+");
};

export class GlobalShortcutService {
  private readonly dispatcher: ShortcutDispatcher;
  private readonly preferencesService: PreferencesReader;
  private readonly registrar: ShortcutRegistrar;
  private registeredAccelerators = new Set<string>();
  private failedBindingIds = new Set<string>();

  constructor(dependencies: GlobalShortcutServiceDependencies = {}) {
    this.dispatcher = dependencies.dispatcher ?? getActionDispatcher();
    this.preferencesService =
      dependencies.preferencesService ?? getPreferencesService();
    this.registrar = dependencies.registrar ?? globalShortcut;
  }

  async start(): Promise<void> {
    await this.refresh();
  }

  async refresh(): Promise<void> {
    this.unregisterAll();

    const preferencesResult = await this.preferencesService.getPreferences();
    if (!preferencesResult.ok) {
      console.error(
        "[shortcuts] Failed to load keyboard shortcut preferences",
        preferencesResult.error,
      );
      return;
    }

    this.registerPreferences(preferencesResult.data);
  }

  dispose(): void {
    this.unregisterAll();
  }

  getFailedRegistrations(): string[] {
    return Array.from(this.failedBindingIds);
  }

  private registerPreferences(preferences: PanevoPreferences): void {
    this.failedBindingIds.clear();

    if (!preferences.keyboardShortcuts.enabled) {
      return;
    }

    const registeredByAccelerator = new Set<string>();
    for (const binding of preferences.keyboardShortcuts.bindings) {
      if (!binding.enabled || !presetNumbersById[binding.id]) {
        continue;
      }

      let anyKeyRegistered = false;
      for (const key of binding.keys) {
        const accelerator = keyboardShortcutKeyToAccelerator(key);
        if (!accelerator || registeredByAccelerator.has(accelerator)) {
          continue;
        }

        const registered = this.registrar.register(accelerator, () => {
          void this.handleBinding(binding);
        });

        if (registered) {
          anyKeyRegistered = true;
          registeredByAccelerator.add(accelerator);
          this.registeredAccelerators.add(accelerator);
        } else {
          console.warn(
            `[shortcuts] Failed to register global shortcut: ${accelerator}`,
          );
        }
      }

      if (binding.keys.length > 0 && !anyKeyRegistered) {
        this.failedBindingIds.add(binding.id);
      }
    }
  }

  private unregisterAll(): void {
    for (const accelerator of this.registeredAccelerators) {
      this.registrar.unregister(accelerator);
    }
    this.registeredAccelerators.clear();
  }

  private async handleBinding(binding: KeyboardShortcutBinding): Promise<void> {
    const presetNumber = presetNumbersById[binding.id];
    if (presetNumber) {
      const result = await this.dispatcher.dispatch({
        type: "preset.recall",
        presetNumber,
        source: "operator",
      });

      if (!result.ok) {
        console.error(
          "[shortcuts] Global shortcut action failed",
          result.error,
        );
      }
    }
  }
}

let globalShortcutService: GlobalShortcutService | null = null;

export const getGlobalShortcutService = (): GlobalShortcutService => {
  globalShortcutService ??= new GlobalShortcutService();
  return globalShortcutService;
};
