import { RadioTower, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/renderer/components/ui/button";
import type { IntegrationConfigEntry } from "@/shared/types";

interface ObsScenesPanelProps {
  obsIntegration: IntegrationConfigEntry;
}

type ObsSceneState = {
  status: "idle" | "loading" | "connected" | "error" | "disabled";
  message: string;
  activeScene?: string;
  scenes: string[];
};

const createInitialSceneState = (
  obsIntegration: IntegrationConfigEntry,
): ObsSceneState => {
  if (obsIntegration.lifecycleState === "disabled") {
    return {
      status: "disabled",
      message: "OBS integration is disabled.",
      scenes: [],
    };
  }

  return {
    status: "idle",
    message: "OBS scenes not loaded.",
    scenes: [],
  };
};

const getObsConnectionInput = (obsIntegration: IntegrationConfigEntry) => {
  const host =
    typeof obsIntegration.settings.host === "string"
      ? obsIntegration.settings.host.trim()
      : "";
  const port = Number(obsIntegration.settings.port);

  if (!host || !Number.isFinite(port)) {
    return null;
  }

  return {
    host,
    port,
    password:
      typeof obsIntegration.settings.password === "string"
        ? obsIntegration.settings.password
        : undefined,
  };
};

export const ObsScenesPanel = ({ obsIntegration }: ObsScenesPanelProps) => {
  const [sceneState, setSceneState] = useState<ObsSceneState>(() =>
    createInitialSceneState(obsIntegration),
  );
  const [switchingScene, setSwitchingScene] = useState<string | null>(null);
  const canConnect = obsIntegration.lifecycleState !== "disabled";
  const statusTone =
    sceneState.status === "connected" && sceneState.activeScene
      ? "live"
      : sceneState.status;
  const statusMessage =
    sceneState.status === "connected" ? null : sceneState.message;

  const refreshScenes = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!canConnect) {
        setSceneState(createInitialSceneState(obsIntegration));
        return;
      }

      const input = getObsConnectionInput(obsIntegration);
      if (!input) {
        setSceneState({
          status: "error",
          message: "OBS host and websocket port are required.",
          scenes: [],
        });
        return;
      }

      if (!options?.silent) {
        setSceneState((current) => ({
          ...current,
          status: "loading",
          message: "Loading OBS scenes...",
        }));
      }

      const result = await window.panevo.getObsSceneList(input);
      if (!result.ok) {
        setSceneState({
          status: "error",
          message: `${result.error.code}: ${result.error.message}`,
          scenes: [],
        });
        return;
      }

      setSceneState({
        status: "connected",
        message: "Connected",
        activeScene: result.data.currentProgramSceneName,
        scenes: result.data.scenes.map((scene) => scene.name),
      });
    },
    [canConnect, obsIntegration],
  );

  useEffect(() => {
    void refreshScenes();
  }, [refreshScenes]);

  const switchScene = (sceneName: string) => {
    void (async () => {
      setSwitchingScene(sceneName);

      const result = await window.panevo.dispatchAction({
        type: "obs.scene.switch",
        source: "operator",
        sceneName,
      });

      if (!result.ok) {
        setSceneState((current) => ({
          ...current,
          status: "error",
          message: `${result.error.code}: ${result.error.message}`,
        }));
        setSwitchingScene(null);
        return;
      }

      await refreshScenes({ silent: true });
      setSwitchingScene(null);
    })();
  };

  return (
    <section className="obs-scenes-panel">
      <div className="obs-scenes-header">
        <div>
          <span className="obs-scenes-title">
            <span className="ctrl-section-label">OBS Scenes</span>
            {sceneState.status === "connected" && (
              <span className="obs-scenes-count">
                {sceneState.scenes.length} scenes
              </span>
            )}
          </span>
          <div className="obs-scenes-status">
            <span className={`obs-status-dot obs-status-${statusTone}`} />
            {statusMessage && <span>{statusMessage}</span>}
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={sceneState.status === "loading" || !canConnect}
          onClick={() => void refreshScenes()}
        >
          <RefreshCw />
          Refresh scenes
        </Button>
      </div>

      <div className="obs-current-scene">
        <span>
          <RadioTower />
          Current program
        </span>
        <strong>{sceneState.activeScene ?? "Not loaded"}</strong>
      </div>

      <div className="obs-scenes-list">
        {sceneState.scenes.length === 0 && (
          <div className="obs-scenes-empty">No OBS scenes loaded</div>
        )}

        {sceneState.scenes.map((scene) => {
          const isActive = scene === sceneState.activeScene;
          const isSwitching = scene === switchingScene;

          return (
            <button
              key={scene}
              type="button"
              className={`obs-scene-row${isActive ? " obs-scene-row-active" : ""}`}
              disabled={
                sceneState.status === "loading" ||
                Boolean(switchingScene) ||
                !canConnect ||
                isActive
              }
              onClick={() => switchScene(scene)}
            >
              <span className="obs-scene-row-main">
                <span className="obs-scene-indicator" />
                <span>{scene}</span>
              </span>
              <span className="obs-scene-row-action">
                {isActive ? "Live" : isSwitching ? "Switching" : "Switch"}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
};
