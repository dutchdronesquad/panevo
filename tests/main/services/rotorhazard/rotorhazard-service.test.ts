import { describe, expect, it } from "vitest";
import type { NormalizedRotorHazardConnectionInput } from "@/main/services/rotorhazard/rotorhazard-protocol";
import { normalizeRotorHazardConnectionInput } from "@/main/services/rotorhazard/rotorhazard-protocol";
import {
  RotorHazardService,
  type RotorHazardSocket,
} from "@/main/services/rotorhazard/rotorhazard-service";

type SocketEvent = "connect" | "connect_error" | "disconnect";

class FakeRotorHazardSocket implements RotorHazardSocket {
  id = "socket-test";
  private readonly listeners = new Map<
    SocketEvent,
    Array<(...args: unknown[]) => void>
  >();

  constructor(
    private readonly connectHandler: (socket: FakeRotorHazardSocket) => void,
  ) {}

  connect(): this {
    this.connectHandler(this);
    return this;
  }

  disconnect(): this {
    return this;
  }

  once(event: SocketEvent, listener: (...args: unknown[]) => void): this {
    this.listeners.set(event, [...(this.listeners.get(event) ?? []), listener]);
    return this;
  }

  off(event: SocketEvent, listener: (...args: unknown[]) => void): this {
    this.listeners.set(
      event,
      (this.listeners.get(event) ?? []).filter(
        (candidate) => candidate !== listener,
      ),
    );
    return this;
  }

  emit(event: SocketEvent, ...args: unknown[]): void {
    const listeners = [...(this.listeners.get(event) ?? [])];
    this.listeners.set(event, []);
    for (const listener of listeners) {
      listener(...args);
    }
  }
}

describe("normalizeRotorHazardConnectionInput", () => {
  it("normalizes RotorHazard Socket.IO connection settings", () => {
    expect(
      normalizeRotorHazardConnectionInput({
        host: " 192.168.1.20 ",
        port: 5000,
        timeoutMs: 100,
      }),
    ).toEqual({
      baseUrl: "http://192.168.1.20:5000",
      host: "192.168.1.20",
      port: 5000,
      timeoutMs: 500,
    });
  });

  it("uses RotorHazard's default port", () => {
    expect(
      normalizeRotorHazardConnectionInput({
        host: "rotorhazard.local",
      }),
    ).toMatchObject({
      baseUrl: "http://rotorhazard.local:5000",
      host: "rotorhazard.local",
      port: 5000,
    });
  });

  it("rejects invalid RotorHazard ports", () => {
    expect(() =>
      normalizeRotorHazardConnectionInput({
        host: "192.168.1.20",
        port: 70000,
      }),
    ).toThrow("RotorHazard port must be between 1 and 65535.");
  });
});

describe("RotorHazardService", () => {
  it("confirms a RotorHazard Socket.IO connection", async () => {
    let normalizedInput: NormalizedRotorHazardConnectionInput | null = null;
    const service = new RotorHazardService((input) => {
      normalizedInput = input;
      return new FakeRotorHazardSocket((socket) => {
        socket.emit("connect");
      });
    });

    const result = await service.testConnection({
      host: "rotorhazard.local",
    });

    expect(normalizedInput).toMatchObject({
      baseUrl: "http://rotorhazard.local:5000",
    });
    expect(result).toEqual({
      ok: true,
      data: expect.objectContaining({
        connected: true,
        baseUrl: "http://rotorhazard.local:5000",
        transport: "socket.io",
        message: "RotorHazard Socket.IO connection is available.",
        socketId: "socket-test",
      }),
    });
  });

  it("returns a structured connection error", async () => {
    const service = new RotorHazardService(
      () =>
        new FakeRotorHazardSocket((socket) => {
          socket.emit("connect_error", new Error("connection refused"));
        }),
    );

    await expect(
      service.testConnection({
        host: "127.0.0.1",
        port: 5000,
      }),
    ).resolves.toEqual({
      ok: false,
      error: {
        code: "ROTORHAZARD_CONNECTION_FAILED",
        message: "connection refused",
      },
    });
  });
});
