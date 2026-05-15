import { beforeEach, describe, expect, it, vi } from "vitest";
import { ObsService } from "../../../../src/main/services/obs/obs-service";
import type {
  ObsWebSocket,
  ObsWebSocketFactory,
} from "../../../../src/main/services/obs/obs-session";

type FakeObsScenario = {
  authentication?: {
    challenge: string;
    salt: string;
  };
  requestFailures?: Record<string, string>;
  responses?: Record<string, unknown>;
};

class FakeObsWebSocket implements ObsWebSocket {
  readonly sentMessages: unknown[] = [];
  readonly close = vi.fn();
  private readonly listeners: Record<
    string,
    Array<(event: { data?: unknown }) => void>
  > = {};

  constructor(
    readonly url: string,
    private readonly scenario: FakeObsScenario,
  ) {
    queueMicrotask(() => {
      this.emit("message", {
        data: JSON.stringify({
          op: 0,
          d: {
            authentication: scenario.authentication,
          },
        }),
      });
    });
  }

  addEventListener(
    type: "message" | "error" | "close",
    listener: (event: { data?: unknown }) => void,
  ): void {
    this.listeners[type] = [...(this.listeners[type] ?? []), listener];
  }

  send(data: string): void {
    const message = JSON.parse(data) as {
      op: number;
      d?: {
        requestType?: string;
        requestId?: string;
        requestData?: Record<string, unknown>;
      };
    };
    this.sentMessages.push(message);

    if (message.op === 1) {
      queueMicrotask(() => {
        this.emit("message", {
          data: JSON.stringify({
            op: 2,
            d: {
              negotiatedRpcVersion: 1,
            },
          }),
        });
      });
      return;
    }

    if (message.op === 6 && message.d?.requestType && message.d.requestId) {
      const requestType = message.d.requestType;
      const failure = this.scenario.requestFailures?.[requestType];
      queueMicrotask(() => {
        this.emit("message", {
          data: JSON.stringify({
            op: 7,
            d: {
              requestId: message.d?.requestId,
              requestStatus: failure
                ? { result: false, code: 500, comment: failure }
                : { result: true, code: 100 },
              responseData: this.scenario.responses?.[requestType],
            },
          }),
        });
      });
    }
  }

  private emit(type: string, event: { data?: unknown }): void {
    for (const listener of this.listeners[type] ?? []) {
      listener(event);
    }
  }
}

describe("ObsService", () => {
  let sockets: FakeObsWebSocket[];
  let factory: ReturnType<typeof vi.fn<ObsWebSocketFactory>>;

  const createService = (scenario: FakeObsScenario = {}) => {
    sockets = [];
    factory = vi.fn((url: string) => {
      const socket = new FakeObsWebSocket(url, scenario);
      sockets.push(socket);
      return socket;
    });

    return new ObsService(factory);
  };

  beforeEach(() => {
    sockets = [];
  });

  it("tests an OBS websocket connection and normalizes the endpoint", async () => {
    const service = createService({
      responses: {
        GetVersion: {
          obsVersion: "32.0.0",
          obsWebSocketVersion: "5.6.0",
        },
      },
    });

    const result = await service.testConnection({
      host: "ws://127.0.0.1/",
      port: 4455,
      secure: true,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(factory).toHaveBeenCalledWith("ws://127.0.0.1:4455");
    expect(result.data).toMatchObject({
      connected: true,
      host: "127.0.0.1",
      secure: false,
      obsStudioVersion: "32.0.0",
      obsWebSocketVersion: "5.6.0",
      negotiatedRpcVersion: 1,
    });
    expect(sockets[0].sentMessages).toEqual([
      {
        op: 1,
        d: {
          rpcVersion: 1,
        },
      },
      expect.objectContaining({
        op: 6,
        d: expect.objectContaining({
          requestType: "GetVersion",
        }),
      }),
    ]);
    expect(sockets[0].close).toHaveBeenCalledTimes(1);
  });

  it("loads and normalizes the OBS scene list", async () => {
    const service = createService({
      responses: {
        GetSceneList: {
          currentProgramSceneName: "Race",
          currentPreviewSceneName: "Holding",
          scenes: [
            { sceneName: "Race", sceneUuid: "scene-race" },
            { sceneName: "-----" },
            { sceneName: " --- " },
            { sceneName: "Holding" },
            { sceneUuid: "invalid" },
          ],
        },
      },
    });

    const result = await service.getSceneList({
      host: "127.0.0.1",
      port: 4455,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.currentProgramSceneName).toBe("Race");
    expect(result.data.scenes).toEqual([
      { name: "Holding", uuid: undefined },
      { name: "Race", uuid: "scene-race" },
    ]);
  });

  it("reverses the scene order from OBS to match the OBS scenes panel", async () => {
    const service = createService({
      responses: {
        GetSceneList: {
          scenes: [
            { sceneName: "Top" },
            { sceneName: "Middle" },
            { sceneName: "Bottom" },
          ],
        },
      },
    });

    const result = await service.getSceneList({
      host: "127.0.0.1",
      port: 4455,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.scenes.map((scene) => scene.name)).toEqual([
      "Bottom",
      "Middle",
      "Top",
    ]);
  });

  it("switches the current OBS program scene", async () => {
    const service = createService({
      responses: {
        SetCurrentProgramScene: {},
      },
    });

    const result = await service.switchScene(
      {
        host: "127.0.0.1",
        port: 4455,
      },
      "Race",
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.command).toBe("obs.scene.switch:Race");
    expect(sockets[0].sentMessages).toContainEqual(
      expect.objectContaining({
        op: 6,
        d: expect.objectContaining({
          requestType: "SetCurrentProgramScene",
          requestData: {
            sceneName: "Race",
          },
        }),
      }),
    );
  });

  it("requires a password when OBS authentication is enabled", async () => {
    const service = createService({
      authentication: {
        challenge: "challenge",
        salt: "salt",
      },
    });

    const result = await service.testConnection({
      host: "127.0.0.1",
      port: 4455,
    });

    expect(result).toEqual({
      ok: false,
      error: {
        code: "OBS_AUTH_REQUIRED",
        message: "OBS websocket requires a password for this connection.",
      },
    });
    expect(sockets[0].sentMessages).toEqual([]);
    expect(sockets[0].close).toHaveBeenCalledTimes(1);
  });

  it("returns OBS request failures as structured Panevo errors", async () => {
    const service = createService({
      requestFailures: {
        SetCurrentProgramScene: "No source was found by the name of Race.",
      },
    });

    const result = await service.switchScene(
      {
        host: "127.0.0.1",
        port: 4455,
      },
      "Race",
    );

    expect(result).toEqual({
      ok: false,
      error: {
        code: "OBS_REQUEST_FAILED",
        message: "No source was found by the name of Race.",
      },
    });
  });
});
