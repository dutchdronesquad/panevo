import { PreferencesService } from "./preferences-service";

let preferencesService: PreferencesService | null = null;

export const getPreferencesService = (): PreferencesService => {
  preferencesService ??= new PreferencesService();
  return preferencesService;
};
