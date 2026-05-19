import { describe, expect, it } from "vitest";
import type { AutomationRule } from "@/shared/types";
import {
  automationRuleDraftIsValid,
  automationRuleFromDraft,
  canEditAutomationRule,
  createAutomationRuleDraft,
  draftFromAutomationRule,
} from "@/renderer/views/automation-builder-model";

const createRule = (
  overrides: Partial<AutomationRule> = {},
): AutomationRule => ({
  id: "rule-race-start",
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
      id: "preset",
      type: "panevo.action",
      action: {
        type: "preset.recall",
        presetNumber: 3,
      },
    },
    {
      id: "obs",
      type: "panevo.action",
      action: {
        type: "obs.scene.switch",
        sceneName: "Race",
      },
    },
  ],
  ...overrides,
});

describe("automation builder model", () => {
  it("starts new drafts empty and disabled", () => {
    expect(createAutomationRuleDraft()).toEqual({
      label: "",
      enabled: false,
      eventType: "",
      conditionNotStale: false,
      conditionStatus: "any",
      actions: [],
    });
  });

  it("converts an editable automation rule to a builder draft", () => {
    expect(draftFromAutomationRule(createRule())).toEqual({
      id: "rule-race-start",
      label: "Race start",
      enabled: true,
      eventType: "race.started",
      conditionNotStale: true,
      conditionStatus: "racing",
      actions: [
        {
          id: "preset",
          type: "preset.recall",
          presetNumber: "3",
          sceneName: "",
          stopTarget: "all",
        },
        {
          id: "obs",
          type: "obs.scene.switch",
          presetNumber: "",
          sceneName: "Race",
          stopTarget: "all",
        },
      ],
    });
  });

  it("converts a draft back to an automation rule and clamps preset values", () => {
    expect(
      automationRuleFromDraft({
        id: "rule-race-start",
        label: " Race start ",
        enabled: false,
        eventType: "race.started",
        conditionNotStale: true,
        conditionStatus: "racing",
        actions: [
          {
            id: "preset",
            type: "preset.recall",
            presetNumber: "300",
            sceneName: "",
            stopTarget: "all",
          },
          {
            id: "obs",
            type: "obs.scene.switch",
            presetNumber: "1",
            sceneName: " Race ",
            stopTarget: "all",
          },
          {
            id: "stop",
            type: "camera.stop",
            presetNumber: "1",
            sceneName: "",
            stopTarget: "all",
          },
        ],
      }),
    ).toEqual({
      id: "rule-race-start",
      label: "Race start",
      enabled: false,
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
          id: "preset",
          type: "panevo.action",
          action: {
            type: "preset.recall",
            presetNumber: 255,
          },
        },
        {
          id: "obs",
          type: "panevo.action",
          action: {
            type: "obs.scene.switch",
            sceneName: "Race",
          },
        },
        {
          id: "stop",
          type: "panevo.action",
          action: {
            type: "camera.stop",
            target: "all",
          },
        },
      ],
    });
  });

  it("validates required draft fields", () => {
    expect(
      automationRuleDraftIsValid({
        id: "rule-race-start",
        label: "Race start",
        enabled: false,
        eventType: "",
        conditionNotStale: true,
        conditionStatus: "any",
        actions: [
          {
            id: "obs",
            type: "obs.scene.switch",
            presetNumber: "1",
            sceneName: "Race",
            stopTarget: "all",
          },
        ],
      }),
    ).toBe(false);

    expect(
      automationRuleDraftIsValid({
        id: "rule-race-start",
        label: "Race start",
        enabled: false,
        eventType: "race.started",
        conditionNotStale: true,
        conditionStatus: "any",
        actions: [
          {
            id: "obs",
            type: "obs.scene.switch",
            presetNumber: "1",
            sceneName: "Race",
            stopTarget: "all",
          },
        ],
      }),
    ).toBe(true);
  });

  it("allows editing only supported rule shapes", () => {
    expect(canEditAutomationRule(createRule())).toBe(true);
    expect(
      canEditAutomationRule(
        createRule({
          trigger: {
            type: "manual.action",
          },
        }),
      ),
    ).toBe(false);
    expect(
      canEditAutomationRule(
        createRule({
          actions: [
            {
              type: "panevo.action",
              action: {
                type: "camera.ptz.move",
                direction: "pan-left",
              },
            },
          ],
        }),
      ),
    ).toBe(false);
  });
});
