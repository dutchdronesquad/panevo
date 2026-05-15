import { ActionDispatcher } from "./action-dispatcher";

let actionDispatcher: ActionDispatcher | null = null;

export const getActionDispatcher = (): ActionDispatcher => {
  actionDispatcher ??= new ActionDispatcher();
  return actionDispatcher;
};
