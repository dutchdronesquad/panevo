import { io } from "socket.io-client";
import type {
  RotorHazardConnectionInput,
  RotorHazardConnectionStatus,
  PanevoResult,
} from "@/shared/types";
import { toRotorHazardError } from "./rotorhazard-errors";
import {
  createRotorHazardStatus,
  normalizeRotorHazardConnectionInput,
  type NormalizedRotorHazardConnectionInput,
} from "./rotorhazard-protocol";

type RotorHazardSocketEvent = "connect" | "connect_error" | "disconnect";

export interface RotorHazardSocket {
  id?: string;
  connect: () => unknown;
  disconnect: () => unknown;
  once: (
    event: RotorHazardSocketEvent,
    listener: (...args: unknown[]) => void,
  ) => unknown;
  off: (
    event: RotorHazardSocketEvent,
    listener: (...args: unknown[]) => void,
  ) => unknown;
}

export type RotorHazardSocketFactory = (
  input: NormalizedRotorHazardConnectionInput,
) => RotorHazardSocket;

const success = <T>(data: T): PanevoResult<T> => ({ ok: true, data });

const failure = <T = never>(
  code: string,
  message: string,
): PanevoResult<T> => ({
  ok: false,
  error: { code, message },
});

export const defaultRotorHazardSocketFactory: RotorHazardSocketFactory = (
  input,
) =>
  io(input.baseUrl, {
    autoConnect: false,
    reconnection: false,
    timeout: input.timeoutMs,
    transports: ["websocket"],
  });

export class RotorHazardService {
  constructor(
    private readonly socketFactory = defaultRotorHazardSocketFactory,
  ) {}

  async testConnection(
    input: RotorHazardConnectionInput,
  ): Promise<PanevoResult<RotorHazardConnectionStatus>> {
    let normalized: NormalizedRotorHazardConnectionInput;
    try {
      normalized = normalizeRotorHazardConnectionInput(input);
    } catch (error) {
      return this.toFailure(error);
    }

    const socket = this.socketFactory(normalized);

    return new Promise((resolve) => {
      let settled = false;
      const timeout = setTimeout(() => {
        settle(
          failure(
            "ROTORHAZARD_CONNECTION_TIMEOUT",
            "RotorHazard Socket.IO did not connect in time.",
          ),
        );
      }, normalized.timeoutMs);

      const settle = (
        result: PanevoResult<RotorHazardConnectionStatus>,
      ): void => {
        if (settled) {
          return;
        }

        settled = true;
        clearTimeout(timeout);
        socket.off("connect", handleConnect);
        socket.off("connect_error", handleConnectError);
        socket.off("disconnect", handleDisconnect);
        socket.disconnect();
        resolve(result);
      };

      const handleConnect = (): void => {
        settle(
          success(
            createRotorHazardStatus(
              normalized,
              "RotorHazard Socket.IO connection is available.",
              { socketId: socket.id },
            ),
          ),
        );
      };

      const handleConnectError = (error: unknown): void => {
        settle(this.toFailure(error));
      };

      const handleDisconnect = (): void => {
        if (!settled) {
          settle(
            failure(
              "ROTORHAZARD_CONNECTION_CLOSED",
              "RotorHazard Socket.IO disconnected before Panevo could confirm the connection.",
            ),
          );
        }
      };

      socket.once("connect", handleConnect);
      socket.once("connect_error", handleConnectError);
      socket.once("disconnect", handleDisconnect);

      try {
        socket.connect();
      } catch (error) {
        settle(this.toFailure(error));
      }
    });
  }

  private toFailure<T = never>(error: unknown): PanevoResult<T> {
    const rotorHazardError = toRotorHazardError(error);
    return failure(rotorHazardError.code, rotorHazardError.message);
  }
}
