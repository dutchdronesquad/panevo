import { ipcMain } from "electron";
import type {
  PanevoAction,
  PanevoActionDispatchResult,
  PanevoFeedbackState,
  PanevoResult,
} from "@/shared/types";
import { getActionDispatcher } from "../services/actions/action-dispatcher-instance";

export const registerActionIpc = (): void => {
  const actionDispatcher = getActionDispatcher();

  ipcMain.handle(
    "panevo:dispatch-action",
    async (
      _event,
      action: PanevoAction,
    ): Promise<PanevoResult<PanevoActionDispatchResult>> => {
      return actionDispatcher.dispatch(action);
    },
  );

  ipcMain.handle(
    "panevo:get-feedback-state",
    async (): Promise<PanevoResult<PanevoFeedbackState>> => {
      return actionDispatcher.getFeedbackState();
    },
  );
};
