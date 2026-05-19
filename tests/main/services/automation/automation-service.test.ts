import { describe, expect, it, vi } from "vitest";
import type {
  AutomationRule,
  PanevoAction,
  PanevoActionDispatchResult,
  PanevoRaceEvent,
  PanevoResult,
} from "@/shared/types";
import { AutomationService } from "@/main/services/automation/automation-service";

const success = <T>(data: T): PanevoResult<T> => ({ ok: true, data });

const failure = <T = never>(
  code: string,
  message: string,
): PanevoResult<T> => ({
  ok: false,
  error: { code, message },
});

const createRaceEvent = (
  overrides: Partial<PanevoRaceEvent> = {},
): PanevoRaceEvent => ({
  id: "race-event-1",
  type: "race.started",
  source: "rotorhazard",
  occurredAt: "2026-05-18T10:00:00.000Z",
  raceState: {
    source: "rotorhazard",
    status: "racing",
    activeHeat: {
      id: "12",
      round: 1,
    },
    pilots: [],
    stale: false,
    updatedAt: "2026-05-18T10:00:00.000Z",
  },
  ...overrides,
});

const createRule = (
  overrides: Partial<AutomationRule> = {},
): AutomationRule => ({
  id: "rule-race-start",
  label: "Race start scene",
  enabled: true,
  trigger: {
    type: "race.event",
    eventType: "race.started",
  },
  conditions: [
    {
      type: "race.not-stale",
    },
  ],
  actions: [
    {
      type: "panevo.action",
      action: {
        type: "obs.scene.switch",
        sceneName: "Race",
      },
    },
  ],
  ...overrides,
});

describe("AutomationService", () => {
  it("is disabled by default", async () => {
    const dispatch = vi.fn();
    const service = new AutomationService({
      actionDispatcher: { dispatch },
      rules: [createRule()],
    });

    await expect(
      service.evaluate({
        type: "race.event",
        event: createRaceEvent(),
      }),
    ).resolves.toEqual({
      ok: true,
      data: expect.objectContaining({
        enabled: false,
        matchedRuleCount: 0,
        skippedReason: "automation-disabled",
        runs: [],
      }),
    });
    expect(dispatch).not.toHaveBeenCalled();
    expect(service.getState()).toEqual(
      expect.objectContaining({
        enabled: false,
        ruleCount: 1,
        pausedReason: "automation-disabled",
      }),
    );
  });

  it("dispatches matching automation actions through the Panevo action layer", async () => {
    const dispatch = vi.fn(
      async (
        action: PanevoAction,
      ): Promise<PanevoResult<PanevoActionDispatchResult>> =>
        success({
          actionId: action.id ?? "action-1",
          actionType: action.type,
          source: action.source ?? "automation",
          safety: "guarded",
          status: "completed",
          requestedAt: action.requestedAt ?? "2026-05-18T10:00:00.000Z",
          completedAt: "2026-05-18T10:00:01.000Z",
          message: "done",
          feedback: {
            activeCamera: null,
            connection: {
              status: "unknown",
              message: "Unknown",
            },
            presets: [],
            integrations: [],
            updatedAt: "2026-05-18T10:00:01.000Z",
          },
        }),
    );
    const service = new AutomationService({
      actionDispatcher: { dispatch },
      enabled: true,
      rules: [createRule()],
    });

    const result = await service.evaluate({
      type: "race.event",
      event: createRaceEvent(),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "obs.scene.switch",
        sceneName: "Race",
        source: "automation",
      }),
    );
    expect(result.data).toEqual(
      expect.objectContaining({
        enabled: true,
        matchedRuleCount: 1,
        runs: [
          expect.objectContaining({
            ruleId: "rule-race-start",
            status: "completed",
            actions: [
              expect.objectContaining({
                status: "completed",
              }),
            ],
          }),
        ],
      }),
    );
    expect(service.getState()).toEqual(
      expect.objectContaining({
        enabled: true,
        ruleCount: 1,
        pausedReason: undefined,
        lastTriggeredRule: expect.objectContaining({
          id: "rule-race-start",
          label: "Race start scene",
        }),
        lastRunResult: expect.objectContaining({
          ruleId: "rule-race-start",
          status: "completed",
        }),
      }),
    );
  });

  it("pauses race-aware automation when race state is stale", async () => {
    const dispatch = vi.fn();
    const service = new AutomationService({
      actionDispatcher: { dispatch },
      enabled: true,
      rules: [createRule()],
    });

    await expect(
      service.evaluate({
        type: "race.event",
        event: createRaceEvent({
          raceState: {
            source: "rotorhazard",
            status: "stale",
            pilots: [],
            stale: true,
            updatedAt: "2026-05-18T10:00:00.000Z",
          },
        }),
      }),
    ).resolves.toEqual({
      ok: true,
      data: expect.objectContaining({
        skippedReason: "automation-paused",
        matchedRuleCount: 0,
        runs: [],
      }),
    });
    expect(dispatch).not.toHaveBeenCalled();
    expect(service.getState()).toEqual(
      expect.objectContaining({
        pausedReason: "automation-paused",
      }),
    );
  });

  it("stops a rule when a dispatched action fails", async () => {
    const dispatch = vi.fn(async () =>
      failure("OBS_NOT_CONFIGURED", "Configure OBS before switching scenes."),
    );
    const service = new AutomationService({
      actionDispatcher: { dispatch },
      enabled: true,
      rules: [createRule()],
    });

    await expect(
      service.evaluate({
        type: "race.event",
        event: createRaceEvent(),
      }),
    ).resolves.toEqual({
      ok: true,
      data: expect.objectContaining({
        matchedRuleCount: 1,
        runs: [
          expect.objectContaining({
            status: "failed",
            message: "Configure OBS before switching scenes.",
            actions: [
              expect.objectContaining({
                status: "failed",
                error: {
                  code: "OBS_NOT_CONFIGURED",
                  message: "Configure OBS before switching scenes.",
                },
              }),
            ],
          }),
        ],
      }),
    });
  });

  it("interrupts a running rule when interruptCurrentRun is called between actions", async () => {
    let signalFirstStarted!: () => void;
    let allowFirstToComplete!: () => void;
    const firstActionStarted = new Promise<void>(
      (r) => (signalFirstStarted = r),
    );
    const firstActionCanComplete = new Promise<void>(
      (r) => (allowFirstToComplete = r),
    );

    const dispatch = vi.fn(
      async (
        action: PanevoAction,
      ): Promise<PanevoResult<PanevoActionDispatchResult>> => {
        if (action.type === "obs.scene.switch") {
          signalFirstStarted();
          await firstActionCanComplete;
        }
        return success({
          actionId: action.id ?? action.type,
          actionType: action.type,
          source: action.source ?? "automation",
          safety: "guarded",
          status: "completed",
          requestedAt: action.requestedAt ?? "2026-05-18T10:00:00.000Z",
          completedAt: "2026-05-18T10:00:01.000Z",
          message: "done",
          feedback: {
            activeCamera: null,
            connection: { status: "unknown", message: "Unknown" },
            presets: [],
            integrations: [],
            updatedAt: "2026-05-18T10:00:01.000Z",
          },
        });
      },
    );

    const service = new AutomationService({
      actionDispatcher: { dispatch },
      enabled: true,
      rules: [
        createRule({
          actions: [
            {
              id: "scene",
              type: "panevo.action",
              action: { type: "obs.scene.switch", sceneName: "Race" },
            },
            {
              id: "preset",
              type: "panevo.action",
              action: { type: "preset.recall", presetNumber: 3 },
            },
          ],
        }),
      ],
    });

    const evaluatePromise = service.evaluate({
      type: "race.event",
      event: createRaceEvent(),
    });

    // wait until the first action is executing, then interrupt before it completes
    await firstActionStarted;
    service.interruptCurrentRun();
    allowFirstToComplete();

    const result = await evaluatePromise;
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.runs[0]).toMatchObject({
      status: "interrupted",
      message: expect.stringContaining("stop command"),
    });
    expect(dispatch).toHaveBeenCalledTimes(1);
  });

  it("skips camera-dependent rules when no active camera is configured", async () => {
    const dispatch = vi.fn();
    const service = new AutomationService({
      actionDispatcher: { dispatch },
      enabled: true,
      rules: [
        createRule({
          actions: [
            {
              id: "preset",
              type: "panevo.action",
              action: { type: "preset.recall", presetNumber: 1 },
            },
          ],
        }),
      ],
      isCameraConfigured: async () => false,
    });

    const result = await service.evaluate({
      type: "race.event",
      event: createRaceEvent(),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.runs[0]).toMatchObject({
      status: "skipped",
      message: expect.stringContaining("no active camera"),
    });
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("runs camera-dependent rules when a camera is configured", async () => {
    const dispatch = vi.fn(
      async (
        action: PanevoAction,
      ): Promise<PanevoResult<PanevoActionDispatchResult>> =>
        success({
          actionId: action.id ?? action.type,
          actionType: action.type,
          source: action.source ?? "automation",
          safety: "guarded",
          status: "completed",
          requestedAt: action.requestedAt ?? "2026-05-18T10:00:00.000Z",
          completedAt: "2026-05-18T10:00:01.000Z",
          message: "done",
          feedback: {
            activeCamera: null,
            connection: { status: "unknown", message: "Unknown" },
            presets: [],
            integrations: [],
            updatedAt: "2026-05-18T10:00:01.000Z",
          },
        }),
    );
    const service = new AutomationService({
      actionDispatcher: { dispatch },
      enabled: true,
      rules: [
        createRule({
          actions: [
            {
              id: "preset",
              type: "panevo.action",
              action: { type: "preset.recall", presetNumber: 1 },
            },
          ],
        }),
      ],
      isCameraConfigured: async () => true,
    });

    const result = await service.evaluate({
      type: "race.event",
      event: createRaceEvent(),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.runs[0]).toMatchObject({ status: "completed" });
    expect(dispatch).toHaveBeenCalledTimes(1);
  });

  it("dispatches rule actions in order", async () => {
    const dispatch = vi.fn(
      async (
        action: PanevoAction,
      ): Promise<PanevoResult<PanevoActionDispatchResult>> =>
        success({
          actionId: action.id ?? action.type,
          actionType: action.type,
          source: action.source ?? "automation",
          safety: "guarded",
          status: "completed",
          requestedAt: action.requestedAt ?? "2026-05-18T10:00:00.000Z",
          completedAt: "2026-05-18T10:00:01.000Z",
          message: "done",
          feedback: {
            activeCamera: null,
            connection: {
              status: "unknown",
              message: "Unknown",
            },
            presets: [],
            integrations: [],
            updatedAt: "2026-05-18T10:00:01.000Z",
          },
        }),
    );
    const service = new AutomationService({
      actionDispatcher: { dispatch },
      enabled: true,
      rules: [
        createRule({
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
                presetNumber: 3,
              },
            },
          ],
        }),
      ],
    });

    const result = await service.evaluate({
      type: "race.event",
      event: createRaceEvent(),
    });

    expect(result.ok).toBe(true);
    expect(dispatch).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        type: "obs.scene.switch",
        sceneName: "Race",
      }),
    );
    expect(dispatch).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        type: "preset.recall",
        presetNumber: 3,
      }),
    );
  });
});
