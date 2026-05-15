import { describe, expect, it, vi } from "vitest";
import {
  GlobalShortcutService,
  keyboardShortcutKeyToAccelerator,
} from "../../../../src/main/services/shortcuts/global-shortcut-service";
import { defaultPanevoPreferences } from "../../../../src/shared/keyboard-shortcuts";
import type {
  PanevoAction,
  PanevoActionDispatchResult,
  PanevoPreferences,
  PanevoResult,
} from "../../../../src/shared/types";

vi.mock("electron", () => ({
  globalShortcut: {
    register: vi.fn(),
    unregister: vi.fn(),
    unregisterAll: vi.fn(),
  },
}));

const createPreferences = (
  overrides: Partial<PanevoPreferences["keyboardShortcuts"]> = {},
): PanevoPreferences => ({
  keyboardShortcuts: {
    ...defaultPanevoPreferences.keyboardShortcuts,
    ...overrides,
    bindings:
      overrides.bindings ?? defaultPanevoPreferences.keyboardShortcuts.bindings,
  },
});

const createRegistrar = () => {
  const callbacks = new Map<string, () => void>();

  return {
    callbacks,
    register: vi.fn((accelerator: string, callback: () => void) => {
      callbacks.set(accelerator, callback);
      return true;
    }),
    unregister: vi.fn((accelerator: string) => {
      callbacks.delete(accelerator);
    }),
    unregisterAll: vi.fn(() => {
      callbacks.clear();
    }),
  };
};

describe("keyboardShortcutKeyToAccelerator", () => {
  it("converts stored keyboard codes to Electron accelerators", () => {
    expect(keyboardShortcutKeyToAccelerator("Alt+KeyW")).toBe("Alt+W");
    expect(keyboardShortcutKeyToAccelerator("Ctrl+Digit1")).toBe("Ctrl+1");
    expect(keyboardShortcutKeyToAccelerator("Alt+ArrowUp")).toBe("Alt+Up");
  });

  it("rejects ordinary keys and Meta shortcuts", () => {
    expect(keyboardShortcutKeyToAccelerator("KeyW")).toBeNull();
    expect(keyboardShortcutKeyToAccelerator("Meta+KeyW")).toBeNull();
  });
});

describe("GlobalShortcutService", () => {
  it("registers only enabled preset keyboard shortcuts from preferences", async () => {
    const registrar = createRegistrar();
    const service = new GlobalShortcutService({
      registrar,
      preferencesService: {
        getPreferences: async () =>
          ({
            ok: true,
            data: createPreferences({
              bindings: [
                {
                  id: "preset.1",
                  label: "Recall preset 1",
                  group: "presets",
                  mode: "press",
                  enabled: true,
                  keys: ["Alt+Digit1"],
                },
                {
                  id: "zoom.in",
                  label: "Zoom in",
                  group: "zoom",
                  mode: "hold",
                  enabled: false,
                  keys: ["Alt+KeyE"],
                },
                {
                  id: "stop.all",
                  label: "Stop all",
                  group: "safety",
                  mode: "press",
                  enabled: true,
                  keys: ["Alt+KeyX"],
                },
              ],
            }),
          }) as const,
      },
      dispatcher: {
        dispatch: vi.fn(),
      },
    });

    await service.start();

    expect(registrar.register).toHaveBeenCalledTimes(1);
    expect(registrar.register).toHaveBeenCalledWith(
      "Alt+1",
      expect.any(Function),
    );
  });

  it("refreshes registered shortcuts after preferences change", async () => {
    const registrar = createRegistrar();
    let preferences = createPreferences({
      bindings: [
        {
          id: "preset.1",
          label: "Recall preset 1",
          group: "presets",
          mode: "press",
          enabled: true,
          keys: ["Alt+Digit1"],
        },
      ],
    });
    const service = new GlobalShortcutService({
      registrar,
      preferencesService: {
        getPreferences: async () => ({ ok: true, data: preferences }) as const,
      },
      dispatcher: {
        dispatch: vi.fn(),
      },
    });

    await service.start();
    preferences = createPreferences({
      bindings: [
        {
          id: "preset.2",
          label: "Recall preset 2",
          group: "presets",
          mode: "press",
          enabled: true,
          keys: ["Alt+Digit2"],
        },
      ],
    });
    await service.refresh();

    expect(registrar.unregister).toHaveBeenCalledWith("Alt+1");
    expect(registrar.callbacks.has("Alt+1")).toBe(false);
    expect(registrar.callbacks.has("Alt+2")).toBe(true);
  });

  it("dispatches preset recall from a global shortcut", async () => {
    const registrar = createRegistrar();
    const dispatch = vi.fn(
      async (
        action: PanevoAction,
      ): Promise<PanevoResult<PanevoActionDispatchResult>> => ({
        ok: true,
        data: {
          actionId: "action-test",
          actionType: action.type,
          source: "operator",
          safety: "guarded",
          status: "completed",
          requestedAt: "2026-05-15T00:00:00.000Z",
          completedAt: "2026-05-15T00:00:00.000Z",
          message: "ok",
          feedback: {
            activeCamera: null,
            connection: { status: "unknown", message: "Unknown" },
            presets: [],
            integrations: [],
            updatedAt: "2026-05-15T00:00:00.000Z",
          },
        },
      }),
    );
    const service = new GlobalShortcutService({
      registrar,
      preferencesService: {
        getPreferences: async () =>
          ({
            ok: true,
            data: createPreferences({
              bindings: [
                {
                  id: "preset.3",
                  label: "Recall preset 3",
                  group: "presets",
                  mode: "press",
                  enabled: true,
                  keys: ["Alt+Digit3"],
                },
              ],
            }),
          }) as const,
      },
      dispatcher: { dispatch },
    });

    await service.start();
    registrar.callbacks.get("Alt+3")?.();

    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "preset.recall",
        presetNumber: 3,
        source: "operator",
      }),
    );
  });
});
