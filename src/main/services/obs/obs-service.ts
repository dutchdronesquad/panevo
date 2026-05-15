import type {
  CommandResponse,
  ObsConnectionInput,
  ObsConnectionStatus,
  ObsSceneInfo,
  ObsSceneListResult,
  PanevoResult,
} from "@/shared/types";
import { toObsError } from "./obs-errors";
import {
  createAuthentication,
  normalizeObsConnectionInput,
  OBS_RPC_VERSION,
  toRecord,
  toStringValue,
} from "./obs-protocol";
import {
  defaultObsWebSocketFactory,
  ObsMessageChannel,
  ObsSession,
} from "./obs-session";

const success = <T>(data: T): PanevoResult<T> => ({ ok: true, data });

const failure = <T = never>(
  code: string,
  message: string,
): PanevoResult<T> => ({
  ok: false,
  error: { code, message },
});

const toSceneName = (value: unknown): string | undefined => {
  const name = toStringValue(value)?.trim();
  if (!name || /^[\s-]+$/.test(name)) {
    return undefined;
  }

  return name;
};

export class ObsService {
  constructor(private readonly webSocketFactory = defaultObsWebSocketFactory) {}

  async testConnection(
    input: ObsConnectionInput,
  ): Promise<PanevoResult<ObsConnectionStatus>> {
    const sessionResult = await this.connect(input);
    if (!sessionResult.ok) {
      return sessionResult;
    }

    const session = sessionResult.data;
    try {
      const response = toRecord(await session.request("GetVersion"));
      return success(
        session.createStatus("OBS websocket connection is available.", {
          obsStudioVersion: toStringValue(response?.obsVersion),
          obsWebSocketVersion: toStringValue(response?.obsWebSocketVersion),
        }),
      );
    } catch (error) {
      return this.toFailure(error);
    } finally {
      session.close();
    }
  }

  async getSceneList(
    input: ObsConnectionInput,
  ): Promise<PanevoResult<ObsSceneListResult>> {
    const sessionResult = await this.connect(input);
    if (!sessionResult.ok) {
      return sessionResult;
    }

    const session = sessionResult.data;
    try {
      const response = toRecord(await session.request("GetSceneList"));
      const scenes = Array.isArray(response?.scenes)
        ? response.scenes
            .flatMap((scene): ObsSceneInfo[] => {
              const sceneRecord = toRecord(scene);
              const name = toSceneName(sceneRecord?.sceneName);
              if (!name) {
                return [];
              }

              return [
                {
                  name,
                  uuid: toStringValue(sceneRecord?.sceneUuid),
                },
              ];
            })
            .reverse()
        : [];

      return success({
        ...session.createStatus("OBS scenes were loaded."),
        currentProgramSceneName: toSceneName(response?.currentProgramSceneName),
        currentPreviewSceneName: toSceneName(response?.currentPreviewSceneName),
        scenes,
      });
    } catch (error) {
      return this.toFailure(error);
    } finally {
      session.close();
    }
  }

  async switchScene(
    input: ObsConnectionInput,
    sceneName: string,
  ): Promise<PanevoResult<CommandResponse>> {
    const trimmedSceneName = sceneName.trim();
    if (!trimmedSceneName) {
      return failure(
        "OBS_INVALID_INPUT",
        "An OBS scene name is required before Panevo can switch scenes.",
      );
    }

    const sessionResult = await this.connect(input);
    if (!sessionResult.ok) {
      return sessionResult;
    }

    const session = sessionResult.data;
    try {
      await session.request("SetCurrentProgramScene", {
        sceneName: trimmedSceneName,
      });

      return success({
        command: `obs.scene.switch:${trimmedSceneName}`,
        queuedAt: new Date().toISOString(),
      });
    } catch (error) {
      return this.toFailure(error);
    } finally {
      session.close();
    }
  }

  private async connect(
    input: ObsConnectionInput,
  ): Promise<PanevoResult<ObsSession>> {
    try {
      const normalized = normalizeObsConnectionInput(input);
      const protocol = normalized.secure ? "wss" : "ws";
      const socketUrl = `${protocol}://${normalized.host}:${normalized.port}`;
      const socket = this.webSocketFactory(socketUrl);
      const channel = new ObsMessageChannel(socket);
      const hello = await channel.waitFor(
        (message) => message.op === 0,
        normalized.timeoutMs,
      );
      const authentication = toRecord(toRecord(hello.d)?.authentication);
      const challenge = toStringValue(authentication?.challenge);
      const salt = toStringValue(authentication?.salt);

      if ((challenge || salt) && !normalized.password) {
        socket.close();
        return failure(
          "OBS_AUTH_REQUIRED",
          "OBS websocket requires a password for this connection.",
        );
      }

      socket.send(
        JSON.stringify({
          op: 1,
          d: {
            rpcVersion: OBS_RPC_VERSION,
            authentication:
              challenge && salt && normalized.password
                ? createAuthentication(normalized.password, salt, challenge)
                : undefined,
          },
        }),
      );

      const identified = await channel.waitFor(
        (message) => message.op === 2,
        normalized.timeoutMs,
      );
      const identifiedData = toRecord(identified.d);

      return success(
        new ObsSession(
          normalized,
          socket,
          channel,
          typeof identifiedData?.negotiatedRpcVersion === "number"
            ? identifiedData.negotiatedRpcVersion
            : undefined,
        ),
      );
    } catch (error) {
      return this.toFailure(error);
    }
  }

  private toFailure<T = never>(error: unknown): PanevoResult<T> {
    const obsError = toObsError(error);
    return failure(obsError.code, obsError.message);
  }
}
