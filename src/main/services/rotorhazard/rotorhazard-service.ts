import { io } from "socket.io-client";
import type {
  PanevoRaceEvent,
  PanevoRaceEventType,
  PanevoRacePilot,
  PanevoRaceState,
  PanevoRaceStatus,
  RotorHazardConnectionInput,
  RotorHazardConnectionStatus,
  RotorHazardMonitorState,
  PanevoResult,
} from "@/shared/types";
import { toRotorHazardError } from "./rotorhazard-errors";
import {
  createRotorHazardStatus,
  normalizeRotorHazardConnectionInput,
  type NormalizedRotorHazardConnectionInput,
} from "./rotorhazard-protocol";

const ROTORHAZARD_RACE_STATUS_READY = 0;
const ROTORHAZARD_RACE_STATUS_RACING = 1;
const ROTORHAZARD_RACE_STATUS_DONE = 2;
const ROTORHAZARD_RACE_STATUS_STAGING = 3;
const ROTORHAZARD_LOAD_TYPES = [
  "race_status",
  "frequency_data",
  "current_heat",
] as const;
const MAX_MONITOR_EVENTS = 20;
const MONITOR_RECONNECT_DELAYS_MS = [5000, 10000, 20000, 30000] as const;

export interface RotorHazardSocket {
  id?: string;
  connect: () => unknown;
  disconnect: () => unknown;
  once: (event: string, listener: (...args: unknown[]) => void) => unknown;
  off: (event: string, listener: (...args: unknown[]) => void) => unknown;
  on: (event: string, listener: (...args: unknown[]) => void) => unknown;
  emit: (event: string, ...args: unknown[]) => unknown;
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
  private monitorSocket: RotorHazardSocket | null = null;
  private monitorInput: NormalizedRotorHazardConnectionInput | null = null;
  private monitorSnapshot = new RotorHazardRaceSnapshot();
  private monitorCleanup: (() => void) | null = null;
  private monitorInitialStateTimer: ReturnType<typeof setTimeout> | null = null;
  private monitorReconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private suppressMonitorDisconnect = false;
  private monitorState: RotorHazardMonitorState = createIdleMonitorState();
  private monitorEvents: PanevoRaceEvent[] = [];
  private lastMonitorRaceState: PanevoRaceState | null = null;
  private nextMonitorEventId = 1;
  private monitorReconnectAttempt = 0;

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

  async getRaceState(
    input: RotorHazardConnectionInput,
  ): Promise<PanevoResult<PanevoRaceState>> {
    let normalized: NormalizedRotorHazardConnectionInput;
    try {
      normalized = normalizeRotorHazardConnectionInput(input);
    } catch (error) {
      return this.toFailure(error);
    }

    const socket = this.socketFactory(normalized);
    const snapshot = new RotorHazardRaceSnapshot();

    return new Promise((resolve) => {
      let settled = false;
      const timeout = setTimeout(() => {
        settle(
          failure(
            "ROTORHAZARD_RACE_STATE_TIMEOUT",
            "RotorHazard did not return race state in time.",
          ),
        );
      }, normalized.timeoutMs);

      const settle = (result: PanevoResult<PanevoRaceState>): void => {
        if (settled) {
          return;
        }

        settled = true;
        clearTimeout(timeout);
        socket.off("connect", handleConnect);
        socket.off("connect_error", handleConnectError);
        socket.off("disconnect", handleDisconnect);
        socket.off("race_status", handleRaceStatus);
        socket.off("frequency_data", handleFrequencyData);
        socket.off("current_heat", handleCurrentHeat);
        socket.disconnect();
        resolve(result);
      };

      const maybeResolve = (): void => {
        const raceState = snapshot.toRaceState();
        if (raceState) {
          settle(success(raceState));
        }
      };

      const handleConnect = (): void => {
        socket.emit("load_data", {
          load_types: ROTORHAZARD_LOAD_TYPES,
        });
      };

      const handleConnectError = (error: unknown): void => {
        settle(this.toFailure(error));
      };

      const handleDisconnect = (): void => {
        if (!settled) {
          settle(
            failure(
              "ROTORHAZARD_CONNECTION_CLOSED",
              "RotorHazard Socket.IO disconnected before Panevo received race state.",
            ),
          );
        }
      };

      const handleRaceStatus = (payload: unknown): void => {
        snapshot.setRaceStatus(payload);
        maybeResolve();
      };

      const handleFrequencyData = (payload: unknown): void => {
        snapshot.setFrequencyData(payload);
        maybeResolve();
      };

      const handleCurrentHeat = (payload: unknown): void => {
        snapshot.setCurrentHeat(payload);
        maybeResolve();
      };

      socket.once("connect", handleConnect);
      socket.once("connect_error", handleConnectError);
      socket.once("disconnect", handleDisconnect);
      socket.on("race_status", handleRaceStatus);
      socket.on("frequency_data", handleFrequencyData);
      socket.on("current_heat", handleCurrentHeat);

      try {
        socket.connect();
      } catch (error) {
        settle(this.toFailure(error));
      }
    });
  }

  async startRaceStateMonitor(
    input: RotorHazardConnectionInput,
  ): Promise<PanevoResult<RotorHazardMonitorState>> {
    let normalized: NormalizedRotorHazardConnectionInput;
    try {
      normalized = normalizeRotorHazardConnectionInput(input);
    } catch (error) {
      return this.toFailure(error);
    }

    if (
      this.monitorSocket &&
      this.monitorInput?.baseUrl === normalized.baseUrl
    ) {
      return success(this.monitorState);
    }

    this.cleanupMonitorSocket();
    this.clearMonitorReconnectTimer();
    this.monitorInput = normalized;
    this.monitorSnapshot = new RotorHazardRaceSnapshot();
    this.monitorEvents = [];
    this.lastMonitorRaceState = null;
    this.setMonitorState({
      status: "connecting",
      connected: false,
      stale: false,
      automationPaused: true,
      baseUrl: normalized.baseUrl,
      message: "Connecting to RotorHazard Socket.IO.",
      error: undefined,
      raceState: undefined,
      socketId: undefined,
    });

    const socket = this.socketFactory(normalized);
    this.monitorSocket = socket;

    const handleConnect = (): void => {
      this.setMonitorState({
        status: "connecting",
        connected: true,
        stale: false,
        automationPaused: true,
        baseUrl: normalized.baseUrl,
        socketId: socket.id,
        message: "Connected to RotorHazard; waiting for race state.",
      });
      this.monitorInitialStateTimer = setTimeout(() => {
        if (this.monitorState.raceState) {
          return;
        }

        const staleRaceState = markRaceStateStale();
        this.setMonitorState({
          status: "stale",
          connected: true,
          stale: true,
          automationPaused: true,
          raceState: staleRaceState,
          message: "RotorHazard is connected but has not returned race state.",
        });
        this.appendMonitorEvents([
          this.createRaceEvent("race.data-stale", staleRaceState),
        ]);
      }, normalized.timeoutMs);
      socket.emit("load_data", {
        load_types: ROTORHAZARD_LOAD_TYPES,
      });
    };

    const handleConnectError = (error: unknown): void => {
      const rotorHazardError = toRotorHazardError(error);
      const staleRaceState = markRaceStateStale(this.monitorState.raceState);
      this.setMonitorState({
        status: "error",
        connected: false,
        stale: true,
        automationPaused: true,
        baseUrl: normalized.baseUrl,
        message: `${rotorHazardError.message} Panevo will retry Socket.IO in ${this.nextMonitorReconnectDelayMs() / 1000}s.`,
        error: rotorHazardError.code,
        raceState: staleRaceState,
      });
      this.appendMonitorEvents([
        this.createRaceEvent("race.data-stale", staleRaceState, {
          error: rotorHazardError.code,
        }),
      ]);
      this.cleanupMonitorSocket();
      this.scheduleMonitorReconnect(normalized);
    };

    const handleDisconnect = (): void => {
      if (this.suppressMonitorDisconnect) {
        return;
      }

      this.clearMonitorInitialStateTimer();
      const staleRaceState = markRaceStateStale(this.monitorState.raceState);
      this.setMonitorState({
        status: "disconnected",
        connected: false,
        stale: true,
        automationPaused: true,
        baseUrl: normalized.baseUrl,
        message: `RotorHazard Socket.IO disconnected; Panevo will retry in ${this.nextMonitorReconnectDelayMs() / 1000}s.`,
        raceState: staleRaceState,
      });
      this.appendMonitorEvents([
        this.createRaceEvent("race.data-stale", staleRaceState),
      ]);
      this.monitorSocket = null;
      this.monitorCleanup = null;
      this.scheduleMonitorReconnect(normalized);
    };

    const handleRaceStatus = (payload: unknown): void => {
      this.monitorSnapshot.setRaceStatus(payload);
      this.updateMonitorRaceState(normalized, socket);
    };

    const handleFrequencyData = (payload: unknown): void => {
      this.monitorSnapshot.setFrequencyData(payload);
      this.updateMonitorRaceState(normalized, socket);
    };

    const handleCurrentHeat = (payload: unknown): void => {
      this.monitorSnapshot.setCurrentHeat(payload);
      this.updateMonitorRaceState(normalized, socket);
    };

    socket.once("connect", handleConnect);
    socket.once("connect_error", handleConnectError);
    socket.once("disconnect", handleDisconnect);
    socket.on("race_status", handleRaceStatus);
    socket.on("frequency_data", handleFrequencyData);
    socket.on("current_heat", handleCurrentHeat);

    this.monitorCleanup = (): void => {
      socket.off("connect", handleConnect);
      socket.off("connect_error", handleConnectError);
      socket.off("disconnect", handleDisconnect);
      socket.off("race_status", handleRaceStatus);
      socket.off("frequency_data", handleFrequencyData);
      socket.off("current_heat", handleCurrentHeat);
    };

    try {
      socket.connect();
    } catch (error) {
      handleConnectError(error);
    }

    return success(this.monitorState);
  }

  async stopRaceStateMonitor(): Promise<PanevoResult<RotorHazardMonitorState>> {
    this.clearMonitorReconnectTimer();
    this.cleanupMonitorSocket();
    this.monitorInput = null;
    this.monitorSnapshot = new RotorHazardRaceSnapshot();
    this.monitorEvents = [];
    this.lastMonitorRaceState = null;
    this.monitorState = createIdleMonitorState();
    return success(this.monitorState);
  }

  async getMonitorState(): Promise<PanevoResult<RotorHazardMonitorState>> {
    return success(this.monitorState);
  }

  private toFailure<T = never>(error: unknown): PanevoResult<T> {
    const rotorHazardError = toRotorHazardError(error);
    return failure(rotorHazardError.code, rotorHazardError.message);
  }

  private updateMonitorRaceState(
    input: NormalizedRotorHazardConnectionInput,
    socket: RotorHazardSocket,
  ): void {
    const raceState = this.monitorSnapshot.toRaceState();
    if (!raceState) {
      return;
    }

    this.clearMonitorInitialStateTimer();
    this.monitorReconnectAttempt = 0;
    const events = this.createRaceEvents(this.lastMonitorRaceState, raceState);
    this.lastMonitorRaceState = raceState;
    this.appendMonitorEvents(events);
    this.setMonitorState({
      status: "connected",
      connected: true,
      stale: false,
      automationPaused: false,
      baseUrl: input.baseUrl,
      socketId: socket.id,
      raceState,
      recentEvents: this.monitorEvents,
      error: undefined,
      message: `RotorHazard race state is live: ${raceState.status}.`,
    });
  }

  private cleanupMonitorSocket(): void {
    this.clearMonitorInitialStateTimer();
    const socket = this.monitorSocket;
    if (!socket) {
      return;
    }

    this.suppressMonitorDisconnect = true;
    this.monitorCleanup?.();
    socket.disconnect();
    this.suppressMonitorDisconnect = false;
    this.monitorSocket = null;
    this.monitorCleanup = null;
  }

  private scheduleMonitorReconnect(
    input: NormalizedRotorHazardConnectionInput,
  ): void {
    this.clearMonitorReconnectTimer();
    const delayMs = this.nextMonitorReconnectDelayMs();
    this.monitorReconnectAttempt += 1;
    this.monitorReconnectTimer = setTimeout(() => {
      this.monitorReconnectTimer = null;
      if (!this.monitorInput || this.monitorInput.baseUrl !== input.baseUrl) {
        return;
      }

      void this.startRaceStateMonitor({
        host: input.host,
        port: input.port,
        timeoutMs: input.timeoutMs,
      });
    }, delayMs);
  }

  private nextMonitorReconnectDelayMs(): number {
    return (
      MONITOR_RECONNECT_DELAYS_MS[
        Math.min(
          this.monitorReconnectAttempt,
          MONITOR_RECONNECT_DELAYS_MS.length - 1,
        )
      ] ?? MONITOR_RECONNECT_DELAYS_MS[MONITOR_RECONNECT_DELAYS_MS.length - 1]
    );
  }

  private clearMonitorReconnectTimer(): void {
    if (!this.monitorReconnectTimer) {
      return;
    }

    clearTimeout(this.monitorReconnectTimer);
    this.monitorReconnectTimer = null;
  }

  private clearMonitorInitialStateTimer(): void {
    if (!this.monitorInitialStateTimer) {
      return;
    }

    clearTimeout(this.monitorInitialStateTimer);
    this.monitorInitialStateTimer = null;
  }

  private setMonitorState(
    state: Omit<Partial<RotorHazardMonitorState>, "updatedAt">,
  ): void {
    this.monitorState = {
      ...this.monitorState,
      ...state,
      updatedAt: new Date().toISOString(),
    };
  }

  private appendMonitorEvents(events: PanevoRaceEvent[]): void {
    if (events.length === 0) {
      return;
    }

    this.monitorEvents = [...this.monitorEvents, ...events].slice(
      -MAX_MONITOR_EVENTS,
    );
    this.setMonitorState({
      recentEvents: this.monitorEvents,
    });
  }

  private createRaceEvents(
    previousRaceState: PanevoRaceState | null,
    raceState: PanevoRaceState,
  ): PanevoRaceEvent[] {
    const events: PanevoRaceEvent[] = [];
    const activeHeatChanged =
      raceState.activeHeat &&
      (previousRaceState?.activeHeat?.id !== raceState.activeHeat.id ||
        previousRaceState?.activeHeat?.round !== raceState.activeHeat.round);

    if (activeHeatChanged) {
      events.push(this.createRaceEvent("race.active-heat-changed", raceState));
    }

    if (previousRaceState?.status !== raceState.status) {
      const eventType = toRaceEventType(raceState.status);
      if (eventType) {
        events.push(this.createRaceEvent(eventType, raceState));
      }
    }

    return events;
  }

  private createRaceEvent(
    type: PanevoRaceEventType,
    raceState: PanevoRaceState,
    payload?: Record<string, unknown>,
  ): PanevoRaceEvent {
    return {
      id: `rotorhazard-${Date.now()}-${this.nextMonitorEventId++}`,
      type,
      source: "rotorhazard",
      occurredAt: new Date().toISOString(),
      raceState,
      payload,
    };
  }
}

const toRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;

const toStringValue = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;

const toNumberValue = (value: unknown): number | undefined => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : undefined;
};

const normalizeRaceStatus = (value: unknown): PanevoRaceStatus => {
  switch (Number(value)) {
    case ROTORHAZARD_RACE_STATUS_STAGING:
      return "staging";
    case ROTORHAZARD_RACE_STATUS_RACING:
      return "racing";
    case ROTORHAZARD_RACE_STATUS_DONE:
      return "done";
    case ROTORHAZARD_RACE_STATUS_READY:
      return "ready";
    default:
      return "unknown";
  }
};

const toRaceEventType = (
  status: PanevoRaceStatus,
): PanevoRaceEventType | null => {
  switch (status) {
    case "ready":
      return "race.ready";
    case "staging":
      return "race.staging";
    case "racing":
      return "race.started";
    case "finished":
      return "race.finished";
    case "done":
      return "race.done";
    case "stale":
      return "race.data-stale";
    case "unknown":
      return null;
  }
};

const createIdleMonitorState = (): RotorHazardMonitorState => ({
  status: "idle",
  connected: false,
  stale: false,
  automationPaused: false,
  message: "RotorHazard race-state monitor is not running.",
  recentEvents: [],
  updatedAt: new Date().toISOString(),
});

const markRaceStateStale = (raceState?: PanevoRaceState): PanevoRaceState =>
  raceState
    ? {
        ...raceState,
        status: "stale",
        stale: true,
        updatedAt: new Date().toISOString(),
      }
    : {
        source: "rotorhazard",
        status: "stale",
        pilots: [],
        stale: true,
        updatedAt: new Date().toISOString(),
      };

class RotorHazardRaceSnapshot {
  private raceStatusPayload: Record<string, unknown> | null = null;
  private frequencyDataPayload: Record<string, unknown> | null = null;
  private currentHeatPayload: Record<string, unknown> | null = null;

  setRaceStatus(payload: unknown): void {
    this.raceStatusPayload = toRecord(payload);
  }

  setFrequencyData(payload: unknown): void {
    this.frequencyDataPayload = toRecord(payload);
  }

  setCurrentHeat(payload: unknown): void {
    this.currentHeatPayload = toRecord(payload);
  }

  toRaceState(): PanevoRaceState | null {
    if (!this.raceStatusPayload || !this.currentHeatPayload) {
      return null;
    }

    const heatId = toNumberValue(
      this.currentHeatPayload.current_heat ??
        this.raceStatusPayload.race_heat_id,
    );
    const round = toNumberValue(
      this.currentHeatPayload.next_round ?? this.raceStatusPayload.next_round,
    );

    return {
      source: "rotorhazard",
      status: normalizeRaceStatus(this.raceStatusPayload.race_status),
      activeHeat:
        heatId === undefined
          ? undefined
          : {
              id: String(heatId),
              round,
            },
      pilots: this.toPilots(),
      stale: false,
      updatedAt: new Date().toISOString(),
    };
  }

  private toPilots(): PanevoRacePilot[] {
    const heatNodes = toRecord(this.currentHeatPayload?.heatNodes);
    if (!heatNodes) {
      return [];
    }

    return Object.entries(heatNodes)
      .flatMap(([lane, node]): PanevoRacePilot[] => {
        const nodeRecord = toRecord(node);
        if (!nodeRecord) {
          return [];
        }

        return [
          {
            id:
              nodeRecord.pilot_id === null || nodeRecord.pilot_id === undefined
                ? undefined
                : String(nodeRecord.pilot_id),
            callsign: toStringValue(nodeRecord.callsign),
            lane: Number(lane) + 1,
            channel: this.toChannelLabel(Number(lane)),
          },
        ];
      })
      .filter((pilot) => pilot.id || pilot.callsign);
  }

  private toChannelLabel(nodeIndex: number): string | undefined {
    const frequencyData = this.frequencyDataPayload?.fdata;
    if (!Array.isArray(frequencyData)) {
      return undefined;
    }

    const nodeFrequency = toRecord(frequencyData[nodeIndex]);
    if (!nodeFrequency) {
      return undefined;
    }

    const band = toStringValue(nodeFrequency.band);
    const channel = toNumberValue(nodeFrequency.channel);
    const frequency = toNumberValue(nodeFrequency.frequency);
    const channelLabel =
      band && channel !== undefined
        ? `${band}${channel}`
        : (band ?? (channel === undefined ? undefined : String(channel)));

    if (!channelLabel && frequency === undefined) {
      return undefined;
    }

    return frequency === undefined
      ? channelLabel
      : `${channelLabel ?? "frequency"} (${frequency})`;
  }
}
