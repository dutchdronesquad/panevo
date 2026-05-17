import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  defaultKeyboardShortcutBindings,
  defaultPanevoPreferences,
} from "@/shared/keyboard-shortcuts";
import type { PanevoPreferences } from "@/shared/types";
import { PreferencesService } from "@/main/services/preferences/preferences-service";

vi.mock("electron", () => ({
  app: {
    getPath: () => tmpdir(),
  },
}));

let testDir: string;
let preferencesPath: string;

const readSavedPreferences = async (): Promise<PanevoPreferences> =>
  JSON.parse(await readFile(preferencesPath, "utf8")) as PanevoPreferences;

describe("PreferencesService", () => {
  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), "panevo-preferences-test-"));
    preferencesPath = join(testDir, "panevo-preferences.json");
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it("returns default preferences when no file exists", async () => {
    const service = new PreferencesService(preferencesPath);
    const result = await service.getPreferences();

    expect(result).toEqual({
      ok: true,
      data: defaultPanevoPreferences,
    });
  });

  it("normalizes keyboard shortcuts before saving", async () => {
    const service = new PreferencesService(preferencesPath);
    const result = await service.savePreferences({
      keyboardShortcuts: {
        enabled: false,
        bindings: [
          {
            ...defaultKeyboardShortcutBindings[0],
            enabled: false,
            keys: [
              " KeyI ",
              "KeyI",
              "",
              "KeyJ",
              "Ctrl+KeyK",
              "Meta+Alt+KeyL",
              "Alt+KeyM",
              "Alt+KeyN",
              "Alt+KeyO",
            ],
          },
        ],
      },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.keyboardShortcuts.enabled).toBe(false);
    expect(result.data.keyboardShortcuts.bindings).toHaveLength(
      defaultKeyboardShortcutBindings.length,
    );
    expect(result.data.keyboardShortcuts.bindings[0]).toMatchObject({
      id: "ptz.tilt-up",
      enabled: false,
      keys: ["KeyI", "KeyJ", "Ctrl+KeyK", "Alt+KeyM"],
    });
    expect(result.data.keyboardShortcuts.bindings[1]).toMatchObject({
      id: "ptz.tilt-down",
      enabled: true,
      keys: ["ArrowDown"],
    });

    await expect(readSavedPreferences()).resolves.toEqual(result.data);
  });

  it("merges stored preferences with current shortcut definitions", async () => {
    await writeFile(
      preferencesPath,
      JSON.stringify({
        keyboardShortcuts: {
          enabled: true,
          bindings: [
            {
              id: "zoom.in",
              enabled: true,
              keys: ["Ctrl+KeyZ"],
            },
            {
              id: "unknown.action",
              enabled: true,
              keys: ["KeyU"],
            },
          ],
        },
      }),
      "utf8",
    );

    const service = new PreferencesService(preferencesPath);
    const result = await service.getPreferences();

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(
      result.data.keyboardShortcuts.bindings.find(
        (binding) => binding.id === "zoom.in",
      ),
    ).toMatchObject({
      label: "Zoom in",
      group: "zoom",
      mode: "hold",
      keys: ["Ctrl+KeyZ"],
    });
    expect(
      result.data.keyboardShortcuts.bindings
        .map((binding) => binding.id as string)
        .some((id) => id === "unknown.action"),
    ).toBe(false);
  });

  it("falls back to defaults and warns on corrupt JSON", async () => {
    await writeFile(preferencesPath, "{", "utf8");
    const consoleWarn = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);

    const service = new PreferencesService(preferencesPath);
    const result = await service.getPreferences();

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data).toEqual(defaultPanevoPreferences);
    expect(consoleWarn).toHaveBeenCalledWith(
      "[preferences] Corrupt preferences file, using defaults",
      expect.any(SyntaxError),
    );
    consoleWarn.mockRestore();
  });

  it("returns a structured write error when the destination is invalid", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const service = new PreferencesService(testDir);
    const result = await service.savePreferences(defaultPanevoPreferences);

    expect(result).toEqual({
      ok: false,
      error: {
        code: "PREFERENCES_WRITE_FAILED",
        message: "Unable to save local Panevo preferences.",
      },
    });
    expect(consoleError).toHaveBeenCalledWith(
      "[preferences] Failed to save preferences",
      expect.any(Error),
    );
    consoleError.mockRestore();
  });
});
