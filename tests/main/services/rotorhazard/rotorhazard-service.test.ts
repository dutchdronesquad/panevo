import { describe, expect, it, vi } from "vitest";
import type { NormalizedRotorHazardConnectionInput } from "@/main/services/rotorhazard/rotorhazard-protocol";
import { normalizeRotorHazardConnectionInput } from "@/main/services/rotorhazard/rotorhazard-protocol";
import {
  RotorHazardService,
  type RotorHazardSocket,
} from "@/main/services/rotorhazard/rotorhazard-service";

class FakeRotorHazardSocket implements RotorHazardSocket {
  id = "socket-test";
  private readonly listeners = new Map<
    string,
    Array<{ listener: (...args: unknown[]) => void; once: boolean }>
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

  once(event: string, listener: (...args: unknown[]) => void): this {
    this.listeners.set(event, [
      ...(this.listeners.get(event) ?? []),
      { listener, once: true },
    ]);
    return this;
  }

  off(event: string, listener: (...args: unknown[]) => void): this {
    this.listeners.set(
      event,
      (this.listeners.get(event) ?? []).filter(
        (candidate) => candidate.listener !== listener,
      ),
    );
    return this;
  }

  on(event: string, listener: (...args: unknown[]) => void): this {
    this.listeners.set(event, [
      ...(this.listeners.get(event) ?? []),
      { listener, once: false },
    ]);
    return this;
  }

  emitServer(event: string, ...args: unknown[]): void {
    this.emit(event, ...args);
  }

  emit(event: string, ...args: unknown[]): void {
    const listeners = [...(this.listeners.get(event) ?? [])];
    this.listeners.set(
      event,
      listeners.filter((listener) => !listener.once),
    );
    for (const { listener } of listeners) {
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

  it("loads and normalizes current RotorHazard race state", async () => {
    const service = new RotorHazardService(
      () =>
        new FakeRotorHazardSocket((socket) => {
          socket.emit("connect");
          socket.emitServer("race_status", {
            race_status: 1,
            race_heat_id: 12,
            next_round: 3,
          });
          socket.emitServer("frequency_data", {
            fdata: [
              {
                band: "R",
                channel: 1,
                frequency: 5658,
              },
              {
                band: "R",
                channel: 2,
                frequency: 5695,
              },
            ],
          });
          socket.emitServer("current_heat", {
            current_heat: 12,
            next_round: 3,
            heatNodes: {
              0: {
                pilot_id: 41,
                callsign: "Alpha",
              },
              1: {
                pilot_id: 42,
                callsign: "Bravo",
              },
            },
          });
        }),
    );

    await expect(
      service.getRaceState({
        host: "127.0.0.1",
      }),
    ).resolves.toEqual({
      ok: true,
      data: expect.objectContaining({
        source: "rotorhazard",
        status: "racing",
        activeHeat: {
          id: "12",
          round: 3,
        },
        pilots: [
          {
            id: "41",
            callsign: "Alpha",
            lane: 1,
            channel: "R1 (5658)",
          },
          {
            id: "42",
            callsign: "Bravo",
            lane: 2,
            channel: "R2 (5695)",
          },
        ],
        stale: false,
      }),
    });
  });

  it("normalizes RotorHazard ready status", async () => {
    const service = new RotorHazardService(
      () =>
        new FakeRotorHazardSocket((socket) => {
          socket.emit("connect");
          socket.emitServer("race_status", {
            race_status: 0,
            race_heat_id: 5,
            next_round: 1,
          });
          socket.emitServer("current_heat", {
            current_heat: 5,
            next_round: 1,
            heatNodes: {},
          });
        }),
    );

    await expect(
      service.getRaceState({
        host: "127.0.0.1",
      }),
    ).resolves.toEqual({
      ok: true,
      data: expect.objectContaining({
        status: "ready",
        activeHeat: {
          id: "5",
          round: 1,
        },
      }),
    });
  });

  it("monitors live RotorHazard race state", async () => {
    const service = new RotorHazardService(
      () =>
        new FakeRotorHazardSocket((socket) => {
          socket.emit("connect");
          socket.emitServer("race_status", {
            race_status: 3,
            race_heat_id: 8,
            next_round: 1,
          });
          socket.emitServer("frequency_data", {
            fdata: [
              {
                band: "R",
                channel: 6,
                frequency: 5843,
              },
            ],
          });
          socket.emitServer("current_heat", {
            current_heat: 8,
            next_round: 1,
            heatNodes: {
              0: {
                pilot_id: 9,
                callsign: "Delta",
              },
            },
          });
        }),
    );

    await expect(
      service.startRaceStateMonitor({
        host: "127.0.0.1",
      }),
    ).resolves.toEqual({
      ok: true,
      data: expect.objectContaining({
        status: "connected",
        connected: true,
        stale: false,
        automationPaused: false,
        raceState: expect.objectContaining({
          status: "staging",
          activeHeat: {
            id: "8",
            round: 1,
          },
          pilots: [
            {
              id: "9",
              callsign: "Delta",
              lane: 1,
              channel: "R6 (5843)",
            },
          ],
        }),
        recentEvents: [
          expect.objectContaining({
            type: "race.active-heat-changed",
          }),
          expect.objectContaining({
            type: "race.staging",
          }),
        ],
      }),
    });
  });

  it("marks the monitor stale when RotorHazard connects without race state", async () => {
    vi.useFakeTimers();
    const service = new RotorHazardService(
      () =>
        new FakeRotorHazardSocket((socket) => {
          socket.emit("connect");
        }),
    );

    await service.startRaceStateMonitor({
      host: "127.0.0.1",
      timeoutMs: 500,
    });

    vi.advanceTimersByTime(500);

    await expect(service.getMonitorState()).resolves.toEqual({
      ok: true,
      data: expect.objectContaining({
        status: "stale",
        connected: true,
        stale: true,
        automationPaused: true,
        raceState: expect.objectContaining({
          status: "stale",
          stale: true,
        }),
        recentEvents: [
          expect.objectContaining({
            type: "race.data-stale",
          }),
        ],
      }),
    });

    await service.stopRaceStateMonitor();
    vi.useRealTimers();
  });

  it("pauses future automation and emits a stale event on disconnect", async () => {
    let activeSocket: FakeRotorHazardSocket | undefined;
    const service = new RotorHazardService(
      () =>
        new FakeRotorHazardSocket((socket) => {
          activeSocket = socket;
          socket.emit("connect");
          socket.emitServer("race_status", {
            race_status: 1,
            race_heat_id: 3,
            next_round: 2,
          });
          socket.emitServer("current_heat", {
            current_heat: 3,
            next_round: 2,
            heatNodes: {},
          });
        }),
    );

    await service.startRaceStateMonitor({
      host: "127.0.0.1",
    });

    activeSocket?.emitServer("disconnect");

    await expect(service.getMonitorState()).resolves.toEqual({
      ok: true,
      data: expect.objectContaining({
        status: "disconnected",
        connected: false,
        stale: true,
        automationPaused: true,
        raceState: expect.objectContaining({
          status: "stale",
          stale: true,
        }),
        recentEvents: expect.arrayContaining([
          expect.objectContaining({
            type: "race.data-stale",
          }),
        ]),
      }),
    });
  });

  it("reconnects the monitor after RotorHazard comes back online", async () => {
    vi.useFakeTimers();
    let activeSocket: FakeRotorHazardSocket | undefined;
    let connectionAttempt = 0;
    const service = new RotorHazardService(
      () =>
        new FakeRotorHazardSocket((socket) => {
          activeSocket = socket;
          connectionAttempt += 1;
          socket.emit("connect");

          if (connectionAttempt === 1) {
            socket.emitServer("race_status", {
              race_status: 1,
              race_heat_id: 3,
              next_round: 2,
            });
            socket.emitServer("current_heat", {
              current_heat: 3,
              next_round: 2,
              heatNodes: {},
            });
            return;
          }

          socket.emitServer("race_status", {
            race_status: 0,
            race_heat_id: 4,
            next_round: 1,
          });
          socket.emitServer("current_heat", {
            current_heat: 4,
            next_round: 1,
            heatNodes: {},
          });
        }),
    );

    await service.startRaceStateMonitor({
      host: "127.0.0.1",
      timeoutMs: 500,
    });

    activeSocket?.emitServer("disconnect");

    await expect(service.getMonitorState()).resolves.toEqual({
      ok: true,
      data: expect.objectContaining({
        status: "disconnected",
        message: "RotorHazard Socket.IO disconnected; Panevo will retry in 5s.",
        automationPaused: true,
      }),
    });

    vi.advanceTimersByTime(5000);

    await expect(service.getMonitorState()).resolves.toEqual({
      ok: true,
      data: expect.objectContaining({
        status: "connected",
        connected: true,
        stale: false,
        automationPaused: false,
        raceState: expect.objectContaining({
          status: "ready",
          activeHeat: {
            id: "4",
            round: 1,
          },
        }),
      }),
    });
    expect(connectionAttempt).toBe(2);

    await service.stopRaceStateMonitor();
    vi.useRealTimers();
  });

  it("backs off monitor reconnect attempts after repeated failures", async () => {
    vi.useFakeTimers();
    const service = new RotorHazardService(
      () =>
        new FakeRotorHazardSocket((socket) => {
          socket.emit("connect_error", new Error("connection refused"));
        }),
    );

    await service.startRaceStateMonitor({
      host: "127.0.0.1",
      timeoutMs: 500,
    });

    await expect(service.getMonitorState()).resolves.toEqual({
      ok: true,
      data: expect.objectContaining({
        message: "connection refused Panevo will retry Socket.IO in 5s.",
        automationPaused: true,
      }),
    });

    vi.advanceTimersByTime(5000);

    await expect(service.getMonitorState()).resolves.toEqual({
      ok: true,
      data: expect.objectContaining({
        message: "connection refused Panevo will retry Socket.IO in 10s.",
        automationPaused: true,
      }),
    });

    vi.advanceTimersByTime(10000);

    await expect(service.getMonitorState()).resolves.toEqual({
      ok: true,
      data: expect.objectContaining({
        message: "connection refused Panevo will retry Socket.IO in 20s.",
        automationPaused: true,
      }),
    });

    await service.stopRaceStateMonitor();
    vi.useRealTimers();
  });
});
