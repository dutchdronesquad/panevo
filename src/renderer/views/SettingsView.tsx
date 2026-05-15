import { useCallback, useEffect, useMemo, useState } from "react";
import {
  defaultKeyboardShortcutBindings,
  defaultPanevoPreferences,
  formatKeyboardShortcutKey,
  formatKeyboardShortcutKeys,
  hasKeyboardShortcutActivationModifier,
  normalizeKeyboardShortcutKey,
  keyboardShortcutGroupLabels,
  toKeyboardShortcutKey,
} from "@/shared/keyboard-shortcuts";
import { Button } from "@/renderer/components/ui/button";
import { Switch } from "@/renderer/components/ui/switch";
import type {
  KeyboardShortcutActionId,
  KeyboardShortcutBinding,
  KeyboardShortcutGroup,
  PanevoPreferences,
} from "@/shared/types";

export type Theme = "dark" | "light";

interface SettingsViewProps {
  theme: Theme;
  preferences: PanevoPreferences;
  onThemeChange: (theme: Theme) => void;
  onPreferencesChange: (preferences: PanevoPreferences) => Promise<boolean>;
}

const shortcutGroupOrder: KeyboardShortcutGroup[] = [
  "movement",
  "zoom",
  "presets",
  "safety",
];

const defaultBindingById = new Map(
  defaultKeyboardShortcutBindings.map((binding) => [binding.id, binding]),
);

const clonePreferences = (
  preferences: PanevoPreferences,
): PanevoPreferences => ({
  keyboardShortcuts: {
    enabled: preferences.keyboardShortcuts.enabled,
    bindings: preferences.keyboardShortcuts.bindings.map((binding) => ({
      ...binding,
      keys: [...binding.keys],
    })),
  },
});

const shortcutKeyBlocked = (code: string): boolean => {
  return ["MetaLeft", "MetaRight"].includes(code);
};

const getShortcutScope = (binding: KeyboardShortcutBinding): string =>
  binding.group === "presets" ? "Global" : "Control view";

const requiresActivationModifier = (
  binding: KeyboardShortcutBinding,
): boolean => binding.group === "presets";

export const SettingsView = ({
  theme,
  preferences,
  onThemeChange,
  onPreferencesChange,
}: SettingsViewProps) => {
  const [recordingId, setRecordingId] =
    useState<KeyboardShortcutActionId | null>(null);
  const [shortcutError, setShortcutError] = useState<string | null>(null);
  const [failedShortcutIds, setFailedShortcutIds] = useState<Set<string>>(
    new Set(),
  );

  const refreshShortcutStatus = useCallback(async () => {
    const result = await window.panevo.getShortcutRegistrationStatus();
    if (result.ok) {
      setFailedShortcutIds(new Set(result.data.failedIds));
    }
  }, []);

  useEffect(() => {
    void refreshShortcutStatus();
  }, [refreshShortcutStatus]);

  const bindingsByGroup = useMemo(() => {
    return shortcutGroupOrder.map((group) => ({
      group,
      bindings: preferences.keyboardShortcuts.bindings.filter(
        (binding) => binding.group === group,
      ),
    }));
  }, [preferences.keyboardShortcuts.bindings]);

  const saveKeyboardShortcuts = async (
    updater: (bindings: KeyboardShortcutBinding[]) => KeyboardShortcutBinding[],
    enabled = preferences.keyboardShortcuts.enabled,
  ) => {
    const nextPreferences = clonePreferences(preferences);
    nextPreferences.keyboardShortcuts = {
      enabled,
      bindings: updater(nextPreferences.keyboardShortcuts.bindings),
    };

    const saved = await onPreferencesChange(nextPreferences);
    if (saved) {
      setShortcutError(null);
      void refreshShortcutStatus();
    }
  };

  const updateBinding = (
    bindingId: KeyboardShortcutActionId,
    updater: (binding: KeyboardShortcutBinding) => KeyboardShortcutBinding,
  ) =>
    saveKeyboardShortcuts((bindings) =>
      bindings.map((binding) =>
        binding.id === bindingId ? updater(binding) : binding,
      ),
    );

  const findKeyConflict = (
    bindingId: KeyboardShortcutActionId,
    shortcutKey: string,
  ): KeyboardShortcutBinding | undefined => {
    const normalizedKey = normalizeKeyboardShortcutKey(shortcutKey);
    if (!normalizedKey) {
      return undefined;
    }

    return preferences.keyboardShortcuts.bindings.find(
      (binding) =>
        binding.id !== bindingId &&
        binding.enabled &&
        binding.keys.map(normalizeKeyboardShortcutKey).includes(normalizedKey),
    );
  };

  const canEnableBinding = (binding: KeyboardShortcutBinding): boolean => {
    if (binding.keys.length === 0) {
      setShortcutError("Assign a key before enabling this shortcut.");
      return false;
    }

    if (requiresActivationModifier(binding)) {
      const invalidKey = binding.keys.find(
        (code) => !hasKeyboardShortcutActivationModifier(code),
      );
      if (invalidKey) {
        setShortcutError(
          `${formatKeyboardShortcutKey(invalidKey)} needs Alt or Ctrl for global shortcuts.`,
        );
        return false;
      }
    }

    const conflict = binding.keys
      .map((code) => ({ code, binding: findKeyConflict(binding.id, code) }))
      .find((item) => item.binding);

    if (!conflict?.binding) {
      return true;
    }

    setShortcutError(
      `${formatKeyboardShortcutKey(conflict.code)} is already assigned to ${conflict.binding.label}.`,
    );
    return false;
  };

  const assignShortcutKey = async (
    bindingId: KeyboardShortcutActionId,
    shortcutKey: string,
  ) => {
    const normalizedKey = normalizeKeyboardShortcutKey(shortcutKey);
    if (!normalizedKey) {
      setShortcutError("Choose a key.");
      return;
    }

    const binding = preferences.keyboardShortcuts.bindings.find(
      (item) => item.id === bindingId,
    );
    if (
      binding &&
      requiresActivationModifier(binding) &&
      !hasKeyboardShortcutActivationModifier(normalizedKey)
    ) {
      setShortcutError("Use Alt or Ctrl for global shortcuts.");
      return;
    }

    const conflict = findKeyConflict(bindingId, normalizedKey);
    if (conflict) {
      setShortcutError(
        `${formatKeyboardShortcutKey(normalizedKey)} is already assigned to ${conflict.label}.`,
      );
      return;
    }

    await updateBinding(bindingId, (binding) => ({
      ...binding,
      enabled: true,
      keys: [normalizedKey],
    }));
  };

  useEffect(() => {
    if (!recordingId) {
      return undefined;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      event.preventDefault();
      event.stopPropagation();

      if (event.code === "Escape") {
        setRecordingId(null);
        setShortcutError(null);
        return;
      }

      if (event.metaKey || shortcutKeyBlocked(event.code)) {
        setShortcutError("Choose a key without Cmd.");
        return;
      }

      const shortcutKey = toKeyboardShortcutKey(event);
      if (!shortcutKey) {
        setShortcutError("Choose a key.");
        return;
      }

      void assignShortcutKey(recordingId, shortcutKey);
      setRecordingId(null);
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [recordingId, preferences]);

  return (
    <div className="settings-content">
      <div className="settings-section">
        <span className="ctrl-section-label">Appearance</span>
        <div className="theme-picker">
          <button
            type="button"
            className="theme-option"
            data-active={theme === "dark" || undefined}
            onClick={() => onThemeChange("dark")}
          >
            <span className="theme-swatch theme-swatch--dark" />
            Dark
          </button>
          <button
            type="button"
            className="theme-option"
            data-active={theme === "light" || undefined}
            onClick={() => onThemeChange("light")}
          >
            <span className="theme-swatch theme-swatch--light" />
            Light
          </button>
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-header">
          <span className="ctrl-section-label">Keyboard shortcuts</span>
          <div className="settings-section-actions">
            <label className="settings-switch">
              <span>Enabled</span>
              <Switch
                checked={preferences.keyboardShortcuts.enabled}
                onCheckedChange={(checked) =>
                  void saveKeyboardShortcuts((bindings) => bindings, checked)
                }
              />
            </label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                void onPreferencesChange(
                  clonePreferences(defaultPanevoPreferences),
                )
              }
            >
              Reset all
            </Button>
          </div>
        </div>

        <p className="settings-section-note">
          Presets are global shortcuts. Movement, zoom, and stop work only when
          Panevo is focused on Control.
        </p>

        {shortcutError && (
          <div className="settings-inline-error">{shortcutError}</div>
        )}

        <div className="keyboard-shortcuts-panel">
          {bindingsByGroup.map(({ group, bindings }) => (
            <section className="keyboard-shortcut-group" key={group}>
              <div className="keyboard-shortcut-group-title">
                {keyboardShortcutGroupLabels[group]}
              </div>
              <div className="keyboard-shortcut-list">
                {bindings.map((binding) => {
                  const defaultBinding = defaultBindingById.get(binding.id);
                  const isRecording = recordingId === binding.id;

                  return (
                    <div className="keyboard-shortcut-row" key={binding.id}>
                      <div className="keyboard-shortcut-meta">
                        <span className="keyboard-shortcut-label">
                          {binding.label}
                        </span>
                        <span className="keyboard-shortcut-mode">
                          {binding.mode === "hold" ? "Hold" : "Press"} ·{" "}
                          {getShortcutScope(binding)}
                          {failedShortcutIds.has(binding.id) && (
                            <span
                              className="keyboard-shortcut-registration-error"
                              title="Could not register this shortcut — it may be in use by another app."
                            >
                              {" "}
                              · Not registered
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="keyboard-shortcut-binding">
                        <span data-recording={isRecording || undefined}>
                          {isRecording
                            ? "Press a key"
                            : formatKeyboardShortcutKeys(binding.keys)}
                        </span>
                      </div>
                      <div className="keyboard-shortcut-controls">
                        <Switch
                          size="sm"
                          checked={binding.enabled}
                          aria-label={`${binding.label} enabled`}
                          onCheckedChange={(checked) =>
                            void (checked && !canEnableBinding(binding)
                              ? Promise.resolve()
                              : updateBinding(binding.id, (current) => ({
                                  ...current,
                                  enabled: checked,
                                })))
                          }
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="xs"
                          onClick={() => {
                            setShortcutError(null);
                            setRecordingId(binding.id);
                          }}
                        >
                          Record
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="xs"
                          onClick={() =>
                            void updateBinding(binding.id, (current) => ({
                              ...current,
                              keys: [],
                            }))
                          }
                        >
                          Clear
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="xs"
                          disabled={!defaultBinding}
                          onClick={() =>
                            defaultBinding &&
                            void updateBinding(binding.id, () => ({
                              ...defaultBinding,
                              keys: [...defaultBinding.keys],
                            }))
                          }
                        >
                          Reset
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
};
