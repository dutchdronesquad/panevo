import type {
  AutomationCondition,
  AutomationEvent,
  AutomationEvaluationResult,
  AutomationRule,
  AutomationRuleRunResult,
  AutomationState,
  PanevoAction,
  PanevoActionDispatchResult,
  PanevoResult,
} from "@/shared/types";
import { getActionDispatcher } from "../actions/action-dispatcher-instance";

type ActionDispatcherLike = {
  dispatch: (
    action: PanevoAction,
  ) => Promise<PanevoResult<PanevoActionDispatchResult>>;
};

interface AutomationServiceDependencies {
  actionDispatcher?: ActionDispatcherLike;
  enabled?: boolean;
  rules?: AutomationRule[];
}

const success = <T>(data: T): PanevoResult<T> => ({ ok: true, data });

export class AutomationService {
  private enabled: boolean;
  private rules: AutomationRule[];
  private lastRunResult?: AutomationRuleRunResult;
  private lastTriggeredRule?: AutomationState["lastTriggeredRule"];
  private pausedReason?: string;
  private updatedAt: string;
  private readonly actionDispatcher: ActionDispatcherLike;

  constructor(dependencies: AutomationServiceDependencies = {}) {
    this.enabled = dependencies.enabled ?? false;
    this.rules = dependencies.rules ?? [];
    this.updatedAt = new Date().toISOString();
    this.actionDispatcher =
      dependencies.actionDispatcher ?? getActionDispatcher();
  }

  getState(): AutomationState {
    return {
      enabled: this.enabled,
      ruleCount: this.rules.length,
      lastTriggeredRule: this.lastTriggeredRule,
      lastRunResult: this.lastRunResult,
      pausedReason: this.pausedReason,
      updatedAt: this.updatedAt,
    };
  }

  getRules(): AutomationRule[] {
    return this.rules.map((rule) => ({ ...rule }));
  }

  setEnabled(enabled: boolean): AutomationState {
    this.enabled = enabled;
    this.pausedReason = enabled ? undefined : "automation-disabled";
    this.touch();
    return this.getState();
  }

  setRules(rules: AutomationRule[]): AutomationState {
    this.rules = rules;
    this.touch();
    return this.getState();
  }

  async evaluate(
    event: AutomationEvent,
  ): Promise<PanevoResult<AutomationEvaluationResult>> {
    if (!this.enabled) {
      this.pausedReason = "automation-disabled";
      this.touch();
      return success(this.createSkippedEvaluation("automation-disabled"));
    }

    if (this.eventIsPaused(event)) {
      this.pausedReason = "automation-paused";
      this.touch();
      return success(this.createSkippedEvaluation("automation-paused"));
    }

    this.pausedReason = undefined;
    const matchingRules = this.rules.filter(
      (rule) => rule.enabled && this.triggerMatches(rule, event),
    );
    const runs: AutomationRuleRunResult[] = [];

    for (const rule of matchingRules) {
      if (!this.conditionsMatch(rule.conditions, event)) {
        runs.push({
          ruleId: rule.id,
          ruleLabel: rule.label,
          status: "skipped",
          message: "Automation rule conditions did not match.",
          actions: [],
        });
        continue;
      }

      const run = await this.runRule(rule);
      runs.push(run);
      this.lastRunResult = run;
      this.lastTriggeredRule = {
        id: rule.id,
        label: rule.label,
        triggeredAt: new Date().toISOString(),
      };
    }

    this.touch();
    return success({
      enabled: true,
      matchedRuleCount: matchingRules.length,
      runs,
      evaluatedAt: new Date().toISOString(),
    });
  }

  private createSkippedEvaluation(
    skippedReason: string,
  ): AutomationEvaluationResult {
    return {
      enabled: this.enabled,
      matchedRuleCount: 0,
      skippedReason,
      runs: [],
      evaluatedAt: new Date().toISOString(),
    };
  }

  private eventIsPaused(event: AutomationEvent): boolean {
    return event.type === "race.event" && event.event.raceState.stale;
  }

  private triggerMatches(
    rule: AutomationRule,
    event: AutomationEvent,
  ): boolean {
    const { trigger } = rule;
    if (trigger.type !== event.type) {
      return false;
    }

    if (trigger.type === "race.event" && event.type === "race.event") {
      return !trigger.eventType || trigger.eventType === event.event.type;
    }

    if (trigger.type === "manual.action" && event.type === "manual.action") {
      return !trigger.actionType || trigger.actionType === event.action.type;
    }

    if (trigger.type === "obs.state" && event.type === "obs.state") {
      return !trigger.sceneName || trigger.sceneName === event.sceneName;
    }

    if (
      trigger.type === "control-device.input" &&
      event.type === "control-device.input"
    ) {
      return !trigger.inputId || trigger.inputId === event.inputId;
    }

    return false;
  }

  private conditionsMatch(
    conditions: AutomationCondition[],
    event: AutomationEvent,
  ): boolean {
    return conditions.every((condition) =>
      this.conditionMatches(condition, event),
    );
  }

  private conditionMatches(
    condition: AutomationCondition,
    event: AutomationEvent,
  ): boolean {
    if (condition.type === "race.not-stale") {
      return event.type !== "race.event" || !event.event.raceState.stale;
    }

    if (condition.type === "race.status") {
      return (
        event.type === "race.event" &&
        event.event.raceState.status === condition.status
      );
    }

    return false;
  }

  private async runRule(
    rule: AutomationRule,
  ): Promise<AutomationRuleRunResult> {
    const actionResults: AutomationRuleRunResult["actions"] = [];

    for (const automationAction of rule.actions) {
      const action: PanevoAction = {
        ...automationAction.action,
        id:
          automationAction.action.id ??
          `${rule.id}-${automationAction.id ?? "action"}-${actionResults.length + 1}`,
        source: "automation",
        requestedAt:
          automationAction.action.requestedAt ?? new Date().toISOString(),
      };
      const result = await this.actionDispatcher.dispatch(action);

      if (!result.ok) {
        actionResults.push({
          actionId: action.id ?? `${rule.id}-failed-action`,
          status: "failed",
          error: result.error,
        });
        return {
          ruleId: rule.id,
          ruleLabel: rule.label,
          status: "failed",
          message: result.error.message,
          actions: actionResults,
        };
      }

      actionResults.push({
        actionId: result.data.actionId,
        status: "completed",
        result: result.data,
      });
    }

    return {
      ruleId: rule.id,
      ruleLabel: rule.label,
      status: "completed",
      message: "Automation rule completed.",
      actions: actionResults,
    };
  }

  private touch(): void {
    this.updatedAt = new Date().toISOString();
  }
}
