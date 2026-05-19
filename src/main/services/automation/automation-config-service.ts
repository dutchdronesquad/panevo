import { app } from "electron";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type {
  AutomationAction,
  AutomationCondition,
  AutomationConfig,
  AutomationRule,
  AutomationTrigger,
  PanevoAction,
  PanevoPtzDirection,
  PanevoRaceEventType,
  PanevoRaceStatus,
  PanevoResult,
} from "@/shared/types";

const DEFAULT_CONFIG: AutomationConfig = {
  rules: [],
};

const success = <T>(data: T): PanevoResult<T> => ({ ok: true, data });

const failure = <T = never>(
  code: string,
  message: string,
): PanevoResult<T> => ({
  ok: false,
  error: { code, message },
});

const raceEventTypes: PanevoRaceEventType[] = [
  "race.ready",
  "race.staging",
  "race.started",
  "race.finished",
  "race.done",
  "race.lap-recorded",
  "race.active-heat-changed",
  "race.data-stale",
];

const raceStatuses: PanevoRaceStatus[] = [
  "unknown",
  "ready",
  "staging",
  "racing",
  "finished",
  "done",
  "stale",
];

const panevoActionTypes: PanevoAction["type"][] = [
  "camera.select",
  "camera.ptz.move",
  "camera.zoom.move",
  "camera.stop",
  "camera.focus.mode",
  "camera.focus.move",
  "preset.recall",
  "preset.store",
  "preset.remove",
  "obs.scene.switch",
  "automation.profile.set-enabled",
];

const ptzDirections: PanevoPtzDirection[] = [
  "pan-left",
  "pan-right",
  "tilt-up",
  "tilt-down",
  "up-left",
  "up-right",
  "down-left",
  "down-right",
];

const stopTargets = ["movement", "zoom", "focus", "all"] as const;

export class AutomationConfigService {
  private readonly configPath: string;

  constructor(
    configPath = join(app.getPath("userData"), "panevo-automation.json"),
  ) {
    this.configPath = configPath;
  }

  async getConfig(): Promise<PanevoResult<AutomationConfig>> {
    try {
      const raw = await readFile(this.configPath, "utf8");
      const parsed = JSON.parse(raw) as Partial<AutomationConfig>;
      return success(this.normalizeConfig(parsed));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return success(DEFAULT_CONFIG);
      }

      console.error("[automation] Failed to read automation config", error);
      return failure(
        "AUTOMATION_CONFIG_READ_FAILED",
        "Unable to read local Panevo automation configuration.",
      );
    }
  }

  async saveConfig(
    config: AutomationConfig,
  ): Promise<PanevoResult<AutomationConfig>> {
    const normalized = this.normalizeConfig(config);

    try {
      const tmpPath = `${this.configPath}.tmp`;
      await mkdir(dirname(this.configPath), { recursive: true });
      await writeFile(
        tmpPath,
        `${JSON.stringify(normalized, null, 2)}\n`,
        "utf8",
      );
      await rename(tmpPath, this.configPath);
      return success(normalized);
    } catch (error) {
      console.error("[automation] Failed to save automation config", error);
      return failure(
        "AUTOMATION_CONFIG_WRITE_FAILED",
        "Unable to save local Panevo automation configuration.",
      );
    }
  }

  private normalizeConfig(config: Partial<AutomationConfig>): AutomationConfig {
    if (!Array.isArray(config.rules)) {
      return DEFAULT_CONFIG;
    }

    const seen = new Set<string>();
    const rules = config.rules
      .map((rule, index) => this.normalizeRule(rule, index + 1))
      .filter((rule): rule is AutomationRule => {
        if (!rule || seen.has(rule.id)) {
          return false;
        }

        seen.add(rule.id);
        return true;
      });

    return { rules };
  }

  private normalizeRule(
    rule: Partial<AutomationRule>,
    fallbackNumber: number,
  ): AutomationRule | null {
    if (!rule || typeof rule !== "object") {
      return null;
    }

    const trigger = this.normalizeTrigger(rule.trigger);
    const actions = Array.isArray(rule.actions)
      ? rule.actions
          .map((action) => this.normalizeAutomationAction(action))
          .filter((action): action is AutomationAction => Boolean(action))
      : [];

    if (!trigger || actions.length === 0) {
      return null;
    }

    const id =
      typeof rule.id === "string" && rule.id.trim().length > 0
        ? rule.id.trim().slice(0, 96)
        : `automation-rule-${fallbackNumber}`;

    return {
      id,
      label:
        typeof rule.label === "string" && rule.label.trim().length > 0
          ? rule.label.trim().slice(0, 80)
          : `Automation rule ${fallbackNumber}`,
      enabled: typeof rule.enabled === "boolean" ? rule.enabled : false,
      trigger,
      conditions: Array.isArray(rule.conditions)
        ? rule.conditions
            .map((condition) => this.normalizeCondition(condition))
            .filter((condition): condition is AutomationCondition =>
              Boolean(condition),
            )
        : [],
      actions,
    };
  }

  private normalizeTrigger(trigger: unknown): AutomationTrigger | null {
    const record = toRecord(trigger);
    if (!record || typeof record.type !== "string") {
      return null;
    }

    if (record.type === "race.event") {
      return {
        type: "race.event",
        eventType: includesString(raceEventTypes, record.eventType)
          ? record.eventType
          : undefined,
      };
    }

    if (record.type === "manual.action") {
      return {
        type: "manual.action",
        actionType: includesString(panevoActionTypes, record.actionType)
          ? record.actionType
          : undefined,
      };
    }

    if (record.type === "obs.state") {
      return {
        type: "obs.state",
        sceneName: toBoundedString(record.sceneName, 120),
      };
    }

    if (record.type === "control-device.input") {
      return {
        type: "control-device.input",
        inputId: toBoundedString(record.inputId, 120),
      };
    }

    return null;
  }

  private normalizeCondition(condition: unknown): AutomationCondition | null {
    const record = toRecord(condition);
    if (!record || typeof record.type !== "string") {
      return null;
    }

    if (record.type === "race.not-stale") {
      return { type: "race.not-stale" };
    }

    if (
      record.type === "race.status" &&
      includesString(raceStatuses, record.status)
    ) {
      return {
        type: "race.status",
        status: record.status,
      };
    }

    return null;
  }

  private normalizeAutomationAction(action: unknown): AutomationAction | null {
    const record = toRecord(action);
    if (!record || record.type !== "panevo.action") {
      return null;
    }

    const panevoAction = this.normalizePanevoAction(record.action);
    if (!panevoAction) {
      return null;
    }

    return {
      id: toBoundedString(record.id, 96),
      type: "panevo.action",
      action: panevoAction,
    };
  }

  private normalizePanevoAction(action: unknown): PanevoAction | null {
    const record = toRecord(action);
    if (!record || typeof record.type !== "string") {
      return null;
    }

    switch (record.type) {
      case "camera.select": {
        const cameraId = toBoundedString(record.cameraId, 96);
        return cameraId ? { type: "camera.select", cameraId } : null;
      }
      case "camera.ptz.move":
        return includesString(ptzDirections, record.direction)
          ? {
              type: "camera.ptz.move",
              direction: record.direction,
              speed: toClampedNumber(record.speed, 1, 24),
              panSpeed: toClampedNumber(record.panSpeed, 1, 24),
              tiltSpeed: toClampedNumber(record.tiltSpeed, 1, 24),
            }
          : null;
      case "camera.zoom.move":
        return record.direction === "in" || record.direction === "out"
          ? {
              type: "camera.zoom.move",
              direction: record.direction,
              speed: toClampedNumber(record.speed, 1, 7) ?? 1,
            }
          : null;
      case "camera.stop":
        return includesString(stopTargets, record.target)
          ? { type: "camera.stop", target: record.target }
          : null;
      case "camera.focus.mode":
        return record.mode === "auto" || record.mode === "manual"
          ? { type: "camera.focus.mode", mode: record.mode }
          : null;
      case "camera.focus.move":
        return record.direction === "in" || record.direction === "out"
          ? {
              type: "camera.focus.move",
              direction: record.direction,
              speed: toClampedNumber(record.speed, 1, 7) ?? 1,
            }
          : null;
      case "preset.recall":
        return {
          type: "preset.recall",
          presetNumber: toClampedNumber(record.presetNumber, 0, 255) ?? 0,
        };
      case "preset.store":
        return {
          type: "preset.store",
          presetNumber: toClampedNumber(record.presetNumber, 0, 255) ?? 0,
          presetLabel: toBoundedString(record.presetLabel, 32),
        };
      case "preset.remove":
        return {
          type: "preset.remove",
          presetNumber: toClampedNumber(record.presetNumber, 0, 255) ?? 0,
        };
      case "obs.scene.switch": {
        const sceneName = toBoundedString(record.sceneName, 120);
        return sceneName ? { type: "obs.scene.switch", sceneName } : null;
      }
      case "automation.profile.set-enabled": {
        const profileId = toBoundedString(record.profileId, 96);
        return profileId && typeof record.enabled === "boolean"
          ? {
              type: "automation.profile.set-enabled",
              profileId,
              enabled: record.enabled,
            }
          : null;
      }
      default:
        return null;
    }
  }
}

const toRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;

const toBoundedString = (
  value: unknown,
  maxLength: number,
): string | undefined =>
  typeof value === "string" && value.trim().length > 0
    ? value.trim().slice(0, maxLength)
    : undefined;

const toClampedNumber = (
  value: unknown,
  min: number,
  max: number,
): number | undefined => {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) {
    return undefined;
  }

  return Math.min(max, Math.max(min, Math.round(numberValue)));
};

const includesString = <T extends string>(
  values: readonly T[],
  value: unknown,
): value is T => typeof value === "string" && values.includes(value as T);
