import { app } from "electron";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type {
  IntegrationConfig,
  IntegrationConfigEntry,
  IntegrationLifecycleState,
  PanevoResult,
} from "@/shared/types";

const DEFAULT_CONFIG: IntegrationConfig = {
  integrations: [],
};

const success = <T>(data: T): PanevoResult<T> => ({ ok: true, data });

const failure = <T = never>(
  code: string,
  message: string,
): PanevoResult<T> => ({
  ok: false,
  error: { code, message },
});

const storedLifecycleStates: IntegrationLifecycleState[] = [
  "configured",
  "enabled",
  "disabled",
  "error",
];

export class IntegrationConfigService {
  private readonly configPath: string;

  constructor(
    configPath = join(app.getPath("userData"), "panevo-integrations.json"),
  ) {
    this.configPath = configPath;
  }

  async getConfig(): Promise<PanevoResult<IntegrationConfig>> {
    try {
      const raw = await readFile(this.configPath, "utf8");
      const parsed = JSON.parse(raw) as Partial<IntegrationConfig>;
      return success(this.normalizeConfig(parsed));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return success(DEFAULT_CONFIG);
      }

      console.error("[integrations] Failed to read config", error);
      return failure(
        "INTEGRATION_CONFIG_READ_FAILED",
        "Unable to read local Panevo integration configuration.",
      );
    }
  }

  async saveConfig(
    config: IntegrationConfig,
  ): Promise<PanevoResult<IntegrationConfig>> {
    const normalized = this.normalizeConfig(config);

    try {
      await mkdir(dirname(this.configPath), { recursive: true });
      await writeFile(
        this.configPath,
        `${JSON.stringify(normalized, null, 2)}\n`,
        "utf8",
      );
      return success(normalized);
    } catch (error) {
      console.error("[integrations] Failed to save config", error);
      return failure(
        "INTEGRATION_CONFIG_WRITE_FAILED",
        "Unable to save local Panevo integration configuration.",
      );
    }
  }

  private normalizeConfig(
    config: Partial<IntegrationConfig>,
  ): IntegrationConfig {
    if (!Array.isArray(config.integrations)) {
      return DEFAULT_CONFIG;
    }

    const seen = new Set<string>();
    const integrations = config.integrations
      .map((integration, index) => this.normalizeEntry(integration, index + 1))
      .filter((integration): integration is IntegrationConfigEntry => {
        if (!integration || seen.has(integration.id)) {
          return false;
        }

        seen.add(integration.id);
        return true;
      });

    return { integrations };
  }

  private normalizeEntry(
    entry: Partial<IntegrationConfigEntry>,
    fallbackNumber: number,
  ): IntegrationConfigEntry | null {
    if (!entry || typeof entry !== "object") {
      return null;
    }

    const integrationId =
      typeof entry.integrationId === "string"
        ? entry.integrationId.trim().slice(0, 80)
        : "";

    if (integrationId.length === 0) {
      return null;
    }

    const id =
      typeof entry.id === "string" && entry.id.trim().length > 0
        ? entry.id.trim().slice(0, 96)
        : `integration-${fallbackNumber}-${integrationId}`;
    const lifecycleState = storedLifecycleStates.includes(
      entry.lifecycleState as IntegrationLifecycleState,
    )
      ? (entry.lifecycleState as IntegrationLifecycleState)
      : "configured";

    return {
      id,
      integrationId,
      lifecycleState,
      settings:
        entry.settings && typeof entry.settings === "object"
          ? (entry.settings as Record<string, unknown>)
          : {},
      lastError:
        typeof entry.lastError === "string"
          ? entry.lastError.trim().slice(0, 300)
          : undefined,
      updatedAt:
        typeof entry.updatedAt === "string" && entry.updatedAt.trim().length > 0
          ? entry.updatedAt
          : new Date().toISOString(),
    };
  }
}
