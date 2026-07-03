import type {
  AutomationAction,
  AutomationCondition,
  AutomationRule,
  PanevoRaceEventType,
  PanevoRaceStatus,
} from "@/shared/types";

export type AutomationBuilderActionType =
  "preset.recall" | "obs.scene.switch" | "camera.stop";

export type AutomationBuilderStopTarget = "movement" | "zoom" | "focus" | "all";

export type AutomationBuilderRaceStatus = "any" | PanevoRaceStatus;
export type AutomationBuilderRaceEvent = "" | PanevoRaceEventType;

export interface AutomationBuilderAction {
  id: string;
  type: AutomationBuilderActionType;
  presetNumber: string;
  sceneName: string;
  stopTarget: AutomationBuilderStopTarget;
}

export interface AutomationRuleDraft {
  id?: string;
  label: string;
  enabled: boolean;
  eventType: AutomationBuilderRaceEvent;
  conditionNotStale: boolean;
  conditionStatus: AutomationBuilderRaceStatus;
  actions: AutomationBuilderAction[];
}

export const automationBuilderRaceEvents: Array<{
  value: PanevoRaceEventType;
  label: string;
}> = [
  { value: "race.ready", label: "Race ready" },
  { value: "race.staging", label: "Race staging" },
  { value: "race.started", label: "Race started" },
  { value: "race.finished", label: "Race finished" },
  { value: "race.done", label: "Race done" },
  { value: "race.active-heat-changed", label: "Heat changed" },
  { value: "race.data-stale", label: "Race data stale" },
];

export const automationBuilderRaceStatuses: Array<{
  value: AutomationBuilderRaceStatus;
  label: string;
}> = [
  { value: "any", label: "Any" },
  { value: "ready", label: "Ready" },
  { value: "staging", label: "Staging" },
  { value: "racing", label: "Racing" },
  { value: "finished", label: "Finished" },
  { value: "done", label: "Done" },
  { value: "stale", label: "Stale" },
];

export const automationBuilderStopTargets: Array<{
  value: AutomationBuilderStopTarget;
  label: string;
}> = [
  { value: "movement", label: "Movement" },
  { value: "zoom", label: "Zoom" },
  { value: "focus", label: "Focus" },
  { value: "all", label: "All" },
];

export const createAutomationBuilderAction = (
  type: AutomationBuilderActionType,
  id = createDraftId("automation-action"),
): AutomationBuilderAction => ({
  id,
  type,
  presetNumber: "",
  sceneName: "",
  stopTarget: "all",
});

export const createAutomationRuleDraft = (): AutomationRuleDraft => ({
  label: "",
  enabled: false,
  eventType: "",
  conditionNotStale: false,
  conditionStatus: "any",
  actions: [],
});

export const canEditAutomationRule = (rule: AutomationRule): boolean => {
  if (rule.trigger.type !== "race.event") {
    return false;
  }

  const { trigger } = rule;

  return (
    (!trigger.eventType ||
      automationBuilderRaceEvents.some(
        (event) => event.value === trigger.eventType,
      )) &&
    rule.conditions.every(
      (condition) =>
        condition.type === "race.not-stale" ||
        (condition.type === "race.status" &&
          automationBuilderRaceStatuses.some(
            (status) => status.value === condition.status,
          )),
    ) &&
    rule.actions.length > 0 &&
    rule.actions.every((action) =>
      ["preset.recall", "obs.scene.switch", "camera.stop"].includes(
        action.action.type,
      ),
    )
  );
};

export const draftFromAutomationRule = (
  rule: AutomationRule,
): AutomationRuleDraft => {
  const statusCondition = rule.conditions.find(
    (
      condition,
    ): condition is {
      type: "race.status";
      status: PanevoRaceStatus;
    } => condition.type === "race.status",
  );

  return {
    id: rule.id,
    label: rule.label,
    enabled: rule.enabled,
    eventType:
      rule.trigger.type === "race.event" && rule.trigger.eventType
        ? rule.trigger.eventType
        : "race.started",
    conditionNotStale: rule.conditions.some(
      (condition) => condition.type === "race.not-stale",
    ),
    conditionStatus: statusCondition?.status ?? "any",
    actions: rule.actions
      .map(builderActionFromAutomationAction)
      .filter((action): action is AutomationBuilderAction => Boolean(action)),
  };
};

export const automationRuleFromDraft = (
  draft: AutomationRuleDraft,
): AutomationRule => ({
  id: draft.id ?? createDraftId("automation-rule"),
  label: draft.label.trim(),
  enabled: draft.enabled,
  trigger: {
    type: "race.event",
    eventType: draft.eventType as PanevoRaceEventType,
  },
  conditions: conditionsFromDraft(draft),
  actions: draft.actions.map(automationActionFromBuilderAction),
});

export const automationRuleDraftIsValid = (
  draft: AutomationRuleDraft | null,
): boolean => {
  if (
    !draft ||
    draft.label.trim().length === 0 ||
    draft.eventType === "" ||
    draft.actions.length === 0
  ) {
    return false;
  }

  return draft.actions.every((action) => {
    if (action.type === "preset.recall") {
      return (
        action.presetNumber.trim().length > 0 &&
        Number.isFinite(Number(action.presetNumber))
      );
    }

    if (action.type === "obs.scene.switch") {
      return action.sceneName.trim().length > 0;
    }

    return true;
  });
};

const createDraftId = (prefix: string): string =>
  `${prefix}-${Date.now()}-${Math.round(Math.random() * 10000)}`;

const conditionsFromDraft = (
  draft: AutomationRuleDraft,
): AutomationCondition[] => [
  ...(draft.conditionNotStale
    ? [
        {
          type: "race.not-stale" as const,
        },
      ]
    : []),
  ...(draft.conditionStatus === "any"
    ? []
    : [
        {
          type: "race.status" as const,
          status: draft.conditionStatus,
        },
      ]),
];

const builderActionFromAutomationAction = (
  action: AutomationAction,
): AutomationBuilderAction | null => {
  if (action.action.type === "preset.recall") {
    return {
      id: action.id ?? createDraftId("automation-action"),
      type: "preset.recall",
      presetNumber: String(action.action.presetNumber),
      sceneName: "",
      stopTarget: "all",
    };
  }

  if (action.action.type === "obs.scene.switch") {
    return {
      id: action.id ?? createDraftId("automation-action"),
      type: "obs.scene.switch",
      presetNumber: "",
      sceneName: action.action.sceneName,
      stopTarget: "all",
    };
  }

  if (action.action.type === "camera.stop") {
    return {
      id: action.id ?? createDraftId("automation-action"),
      type: "camera.stop",
      presetNumber: "",
      sceneName: "",
      stopTarget: action.action.target,
    };
  }

  return null;
};

const automationActionFromBuilderAction = (
  action: AutomationBuilderAction,
): AutomationAction => {
  if (action.type === "preset.recall") {
    return {
      id: action.id,
      type: "panevo.action",
      action: {
        type: "preset.recall",
        presetNumber: clampPresetNumber(action.presetNumber),
      },
    };
  }

  if (action.type === "obs.scene.switch") {
    return {
      id: action.id,
      type: "panevo.action",
      action: {
        type: "obs.scene.switch",
        sceneName: action.sceneName.trim(),
      },
    };
  }

  return {
    id: action.id,
    type: "panevo.action",
    action: {
      type: "camera.stop",
      target: action.stopTarget,
    },
  };
};

const clampPresetNumber = (value: string): number => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return 0;
  }

  return Math.min(255, Math.max(0, Math.round(numericValue)));
};
