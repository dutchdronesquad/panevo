import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AutomationConfig } from "@/shared/types";
import { AutomationConfigService } from "@/main/services/automation/automation-config-service";

vi.mock("electron", () => ({
  app: {
    getPath: () => tmpdir(),
  },
}));

let testDir: string;
let configPath: string;

const readSavedConfig = async (): Promise<AutomationConfig> =>
  JSON.parse(await readFile(configPath, "utf8")) as AutomationConfig;

describe("AutomationConfigService", () => {
  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), "panevo-automation-test-"));
    configPath = join(testDir, "panevo-automation.json");
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it("returns an empty automation config when no file exists", async () => {
    const service = new AutomationConfigService(configPath);

    await expect(service.getConfig()).resolves.toEqual({
      ok: true,
      data: {
        rules: [],
      },
    });
  });

  it("normalizes automation rules before saving", async () => {
    const service = new AutomationConfigService(configPath);
    const result = await service.saveConfig({
      rules: [
        {
          id: " race-start ",
          label: " Race start ",
          enabled: true,
          trigger: {
            type: "race.event",
            eventType: "race.started",
          },
          conditions: [
            {
              type: "race.not-stale",
            },
            {
              type: "race.status",
              status: "racing",
            },
          ],
          actions: [
            {
              id: " scene ",
              type: "panevo.action",
              action: {
                type: "obs.scene.switch",
                sceneName: " Race ",
              },
            },
            {
              id: " preset ",
              type: "panevo.action",
              action: {
                type: "preset.recall",
                presetNumber: 300,
              },
            },
          ],
        },
      ],
    });

    expect(result).toEqual({
      ok: true,
      data: {
        rules: [
          {
            id: "race-start",
            label: "Race start",
            enabled: true,
            trigger: {
              type: "race.event",
              eventType: "race.started",
            },
            conditions: [
              {
                type: "race.not-stale",
              },
              {
                type: "race.status",
                status: "racing",
              },
            ],
            actions: [
              {
                id: "scene",
                type: "panevo.action",
                action: {
                  type: "obs.scene.switch",
                  sceneName: "Race",
                },
              },
              {
                id: "preset",
                type: "panevo.action",
                action: {
                  type: "preset.recall",
                  presetNumber: 255,
                },
              },
            ],
          },
        ],
      },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    await expect(readSavedConfig()).resolves.toEqual(result.data);
  });

  it("drops rules without a valid trigger or action", async () => {
    await writeFile(
      configPath,
      JSON.stringify({
        rules: [
          {
            id: "unknown-action",
            label: "Unknown action",
            enabled: true,
            trigger: {
              type: "race.event",
              eventType: "race.started",
            },
            actions: [
              {
                type: "panevo.action",
                action: {
                  type: "camera.fly",
                },
              },
            ],
          },
          {
            id: "valid",
            label: "Valid",
            enabled: true,
            trigger: {
              type: "race.event",
              eventType: "race.done",
            },
            actions: [
              {
                type: "panevo.action",
                action: {
                  type: "camera.stop",
                  target: "all",
                },
              },
            ],
          },
        ],
      }),
      "utf8",
    );

    const service = new AutomationConfigService(configPath);

    await expect(service.getConfig()).resolves.toEqual({
      ok: true,
      data: {
        rules: [
          expect.objectContaining({
            id: "valid",
            actions: [
              {
                type: "panevo.action",
                action: {
                  type: "camera.stop",
                  target: "all",
                },
              },
            ],
          }),
        ],
      },
    });
  });
});
