import type { AutomationConfig, PanevoResult } from "@/shared/types";
import { AutomationConfigService } from "./automation-config-service";
import { AutomationService } from "./automation-service";

let automationService: AutomationService | null = null;
let automationConfigService: AutomationConfigService | null = null;
let automationRulesLoaded = false;

export const getAutomationService = (): AutomationService => {
  automationService ??= new AutomationService();
  return automationService;
};

export const getAutomationConfigService = (): AutomationConfigService => {
  automationConfigService ??= new AutomationConfigService();
  return automationConfigService;
};

export const ensureAutomationRulesLoaded = async (): Promise<
  PanevoResult<AutomationConfig>
> => {
  if (automationRulesLoaded) {
    return {
      ok: true,
      data: {
        rules: getAutomationService().getRules(),
      },
    };
  }

  const result = await getAutomationConfigService().getConfig();
  if (!result.ok) {
    return result;
  }

  getAutomationService().setRules(result.data.rules);
  automationRulesLoaded = true;
  return result;
};

export const saveAutomationConfig = async (
  config: AutomationConfig,
): Promise<PanevoResult<AutomationConfig>> => {
  const result = await getAutomationConfigService().saveConfig(config);
  if (result.ok) {
    getAutomationService().setRules(result.data.rules);
    automationRulesLoaded = true;
  }

  return result;
};
