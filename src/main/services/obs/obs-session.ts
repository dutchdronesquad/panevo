import { randomUUID } from "node:crypto";
import type { ObsConnectionStatus } from "@/shared/types";
import { ObsServiceError, toObsError } from "./obs-errors";
import {
  createObsStatus,
  type NormalizedObsConnectionInput,
  type ObsProtocolMessage,
  type ObsRequestResponse,
  parseObsMessage,
  toRecord,
} from "./obs-protocol";

type ObsWebSocketEvent = {
  data?: unknown;
};

export type ObsWebSocket = {
  send: (data: string) => void;
  close: () => void;
  addEventListener: (
    type: "message" | "error" | "close",
    listener: (event: ObsWebSocketEvent) => void,
  ) => void;
};

export type ObsWebSocketFactory = (url: string) => ObsWebSocket;

export const defaultObsWebSocketFactory: ObsWebSocketFactory = (url) => {
  const WebSocketConstructor = globalThis.WebSocket;
  if (!WebSocketConstructor) {
    throw new ObsServiceError(
      "OBS_WEBSOCKET_UNAVAILABLE",
      "This Electron runtime does not expose a WebSocket client.",
    );
  }

  return new WebSocketConstructor(url) as unknown as ObsWebSocket;
};

export class ObsMessageChannel {
  private readonly messages: ObsProtocolMessage[] = [];
  private readonly waiters: Array<{
    predicate: (message: ObsProtocolMessage) => boolean;
    resolve: (message: ObsProtocolMessage) => void;
    reject: (error: ObsServiceError) => void;
  }> = [];
  private closed = false;

  constructor(private readonly socket: ObsWebSocket) {
    this.socket.addEventListener("message", (event) => {
      try {
        this.receive(parseObsMessage(event.data));
      } catch (error) {
        this.rejectAll(toObsError(error));
      }
    });

    this.socket.addEventListener("error", () => {
      this.rejectAll(
        new ObsServiceError(
          "OBS_CONNECTION_FAILED",
          "Panevo could not connect to OBS websocket.",
        ),
      );
    });

    this.socket.addEventListener("close", () => {
      this.closed = true;
      this.rejectAll(
        new ObsServiceError(
          "OBS_CONNECTION_CLOSED",
          "OBS websocket closed before the request completed.",
        ),
      );
    });
  }

  waitFor(
    predicate: (message: ObsProtocolMessage) => boolean,
    timeoutMs: number,
  ): Promise<ObsProtocolMessage> {
    const queued = this.messages.find(predicate);
    if (queued) {
      this.messages.splice(this.messages.indexOf(queued), 1);
      return Promise.resolve(queued);
    }

    if (this.closed) {
      return Promise.reject(
        new ObsServiceError(
          "OBS_CONNECTION_CLOSED",
          "OBS websocket closed before the request completed.",
        ),
      );
    }

    return new Promise((resolve, reject) => {
      const waiter = {
        predicate,
        resolve: (message: ObsProtocolMessage) => {
          clearTimeout(timeout);
          resolve(message);
        },
        reject: (error: ObsServiceError) => {
          clearTimeout(timeout);
          reject(error);
        },
      };
      const timeout = setTimeout(() => {
        this.waiters.splice(this.waiters.indexOf(waiter), 1);
        reject(
          new ObsServiceError(
            "OBS_CONNECTION_TIMEOUT",
            "OBS websocket did not respond in time.",
          ),
        );
      }, timeoutMs);

      this.waiters.push(waiter);
    });
  }

  private receive(message: ObsProtocolMessage): void {
    const waiter = this.waiters.find((candidate) =>
      candidate.predicate(message),
    );
    if (!waiter) {
      this.messages.push(message);
      return;
    }

    this.waiters.splice(this.waiters.indexOf(waiter), 1);
    waiter.resolve(message);
  }

  private rejectAll(error: ObsServiceError): void {
    while (this.waiters.length > 0) {
      const waiter = this.waiters.shift();
      waiter?.reject(error);
    }
  }
}

export class ObsSession {
  constructor(
    private readonly input: NormalizedObsConnectionInput,
    private readonly socket: ObsWebSocket,
    private readonly channel: ObsMessageChannel,
    private readonly negotiatedRpcVersion?: number,
  ) {}

  async request(
    requestType: string,
    requestData?: Record<string, unknown>,
  ): Promise<unknown> {
    const requestId = randomUUID();
    this.socket.send(
      JSON.stringify({
        op: 6,
        d: {
          requestType,
          requestId,
          requestData,
        },
      }),
    );

    const message = await this.channel.waitFor((candidate) => {
      if (candidate.op !== 7) {
        return false;
      }
      const response = toRecord(candidate.d);
      return response?.requestId === requestId;
    }, this.input.timeoutMs);
    const response = toRecord(message.d) as ObsRequestResponse | null;
    if (!response?.requestStatus?.result) {
      const comment = response?.requestStatus?.comment;
      throw new ObsServiceError(
        "OBS_REQUEST_FAILED",
        comment || `${requestType} failed in OBS websocket.`,
      );
    }

    return response.responseData;
  }

  close(): void {
    this.socket.close();
  }

  createStatus(
    message: string,
    overrides: Partial<ObsConnectionStatus> = {},
  ): ObsConnectionStatus {
    return createObsStatus(this.input, message, {
      negotiatedRpcVersion: this.negotiatedRpcVersion,
      ...overrides,
    });
  }
}
