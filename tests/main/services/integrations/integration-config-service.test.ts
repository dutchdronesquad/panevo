import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { IntegrationConfig } from "../../../../src/shared/types";
import { IntegrationConfigService } from "../../../../src/main/services/integrations/integration-config-service";

vi.mock("electron", () => ({
  app: {
    getPath: () => tmpdir(),
  },
}));

let testDir: string;
let configPath: string;

const readSavedConfig = async (): Promise<IntegrationConfig> =>
  JSON.parse(await readFile(configPath, "utf8")) as IntegrationConfig;

describe("IntegrationConfigService", () => {
  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), "panevo-integrations-test-"));
    configPath = join(testDir, "panevo-integrations.json");
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it("returns an empty integration config when no file exists", async () => {
    const service = new IntegrationConfigService(configPath);
    const result = await service.getConfig();

    expect(result).toEqual({
      ok: true,
      data: {
        integrations: [],
      },
    });
  });

  it("normalizes integration entries before saving", async () => {
    const service = new IntegrationConfigService(configPath);
    const result = await service.saveConfig({
      integrations: [
        {
          id: " obs ",
          integrationId: " obs ",
          lifecycleState: "connected",
          settings: {
            host: "127.0.0.1",
          },
          lastError: " ".repeat(400),
          updatedAt: "",
        },
        {
          id: "obs",
          integrationId: "obs",
          lifecycleState: "enabled",
          settings: {},
          updatedAt: "2026-05-13T00:00:00.000Z",
        },
      ],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.integrations).toHaveLength(1);
    expect(result.data.integrations[0]).toMatchObject({
      id: "obs",
      integrationId: "obs",
      lifecycleState: "configured",
      settings: {
        host: "127.0.0.1",
      },
    });
    expect(result.data.integrations[0].updatedAt).toEqual(expect.any(String));

    await expect(readSavedConfig()).resolves.toEqual(result.data);
  });

  it("drops invalid entries and keeps generated fallback ids", async () => {
    await writeFile(
      configPath,
      JSON.stringify({
        integrations: [
          null,
          {
            integrationId: "rotorhazard",
            lifecycleState: "enabled",
            settings: null,
            updatedAt: "2026-05-13T00:00:00.000Z",
          },
        ],
      }),
      "utf8",
    );

    const service = new IntegrationConfigService(configPath);
    const result = await service.getConfig();

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.integrations).toEqual([
      {
        id: "integration-2-rotorhazard",
        integrationId: "rotorhazard",
        lifecycleState: "enabled",
        settings: {},
        updatedAt: "2026-05-13T00:00:00.000Z",
      },
    ]);
  });

  it("returns a structured read error for invalid JSON", async () => {
    await writeFile(configPath, "{", "utf8");

    const service = new IntegrationConfigService(configPath);

    await expect(service.getConfig()).resolves.toEqual({
      ok: false,
      error: {
        code: "INTEGRATION_CONFIG_READ_FAILED",
        message: "Unable to read local Panevo integration configuration.",
      },
    });
  });

  it("returns a structured write error when the destination is invalid", async () => {
    const service = new IntegrationConfigService(testDir);
    const result = await service.saveConfig({
      integrations: [
        {
          id: "integration-obs",
          integrationId: "obs",
          lifecycleState: "enabled",
          settings: {},
          updatedAt: "2026-05-13T00:00:00.000Z",
        },
      ],
    });

    expect(result).toEqual({
      ok: false,
      error: {
        code: "INTEGRATION_CONFIG_WRITE_FAILED",
        message: "Unable to save local Panevo integration configuration.",
      },
    });
  });
});
