import { app } from "electron";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
  defaultKeyboardShortcutDefinitions,
  defaultPanevoPreferences,
  hasKeyboardShortcutActivationModifier,
  normalizeKeyboardShortcutKey,
} from "@/shared/keyboard-shortcuts";
import type {
  KeyboardShortcutBinding,
  KeyboardShortcutConfig,
  PanevoPreferences,
  PanevoResult,
} from "@/shared/types";

const success = <T>(data: T): PanevoResult<T> => ({ ok: true, data });

const failure = <T = never>(
  code: string,
  message: string,
): PanevoResult<T> => ({
  ok: false,
  error: { code, message },
});

const sanitizeKeys = (
  keys: unknown,
  options: { requireActivationModifier: boolean },
): string[] => {
  if (!Array.isArray(keys)) {
    return [];
  }

  return Array.from(
    new Set(
      keys
        .filter((key): key is string => typeof key === "string")
        .map((key) => normalizeKeyboardShortcutKey(key))
        .filter((key): key is string =>
          Boolean(
            key &&
            (!options.requireActivationModifier ||
              hasKeyboardShortcutActivationModifier(key)) &&
            !key.split("+").includes("Meta"),
          ),
        ),
    ),
  ).slice(0, 4);
};

export class PreferencesService {
  private readonly preferencesPath: string;

  constructor(
    preferencesPath = join(app.getPath("userData"), "panevo-preferences.json"),
  ) {
    this.preferencesPath = preferencesPath;
  }

  async getPreferences(): Promise<PanevoResult<PanevoPreferences>> {
    try {
      const raw = await readFile(this.preferencesPath, "utf8");
      const parsed = JSON.parse(raw) as Partial<PanevoPreferences>;
      return success(this.normalizePreferences(parsed));
    } catch (error) {
      if (
        (error as NodeJS.ErrnoException).code === "ENOENT" ||
        error instanceof SyntaxError
      ) {
        if (error instanceof SyntaxError) {
          console.warn("[preferences] Corrupt preferences file, using defaults", error);
        }
        return success(defaultPanevoPreferences);
      }

      console.error("[preferences] Failed to read preferences", error);
      return failure(
        "PREFERENCES_READ_FAILED",
        "Unable to read local Panevo preferences.",
      );
    }
  }

  async savePreferences(
    preferences: PanevoPreferences,
  ): Promise<PanevoResult<PanevoPreferences>> {
    const normalized = this.normalizePreferences(preferences);

    try {
      const tmpPath = `${this.preferencesPath}.tmp`;
      await mkdir(dirname(this.preferencesPath), { recursive: true });
      await writeFile(tmpPath, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
      await rename(tmpPath, this.preferencesPath);
      return success(normalized);
    } catch (error) {
      console.error("[preferences] Failed to save preferences", error);
      return failure(
        "PREFERENCES_WRITE_FAILED",
        "Unable to save local Panevo preferences.",
      );
    }
  }

  private normalizePreferences(
    preferences: Partial<PanevoPreferences>,
  ): PanevoPreferences {
    return {
      keyboardShortcuts: this.normalizeKeyboardShortcuts(
        preferences.keyboardShortcuts,
      ),
    };
  }

  private normalizeKeyboardShortcuts(
    keyboardShortcuts?: Partial<KeyboardShortcutConfig>,
  ): KeyboardShortcutConfig {
    const storedBindings: unknown[] = Array.isArray(keyboardShortcuts?.bindings)
      ? keyboardShortcuts.bindings
      : [];
    const storedById = new Map<string, Partial<KeyboardShortcutBinding>>();

    for (const binding of storedBindings) {
      if (!binding || typeof binding !== "object" || !("id" in binding)) {
        continue;
      }

      const id = (binding as { id?: unknown }).id;
      if (typeof id === "string") {
        storedById.set(id, binding as Partial<KeyboardShortcutBinding>);
      }
    }

    return {
      enabled:
        typeof keyboardShortcuts?.enabled === "boolean"
          ? keyboardShortcuts.enabled
          : defaultPanevoPreferences.keyboardShortcuts.enabled,
      bindings: defaultKeyboardShortcutDefinitions.map((definition) => {
        const stored = storedById.get(definition.id);
        const keys =
          stored && "keys" in stored
            ? sanitizeKeys(stored.keys, {
                requireActivationModifier: definition.group === "presets",
              })
            : definition.keys;
        const enabled =
          keys.length > 0 &&
          (typeof stored?.enabled === "boolean" ? stored.enabled : true);

        return { ...definition, enabled, keys };
      }),
    };
  }
}
