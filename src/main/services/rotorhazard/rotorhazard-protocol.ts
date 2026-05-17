import type {
  RotorHazardConnectionInput,
  RotorHazardConnectionStatus,
} from "@/shared/types";
import { RotorHazardServiceError } from "./rotorhazard-errors";

export interface NormalizedRotorHazardConnectionInput {
  baseUrl: string;
  host: string;
  port: number;
  timeoutMs: number;
}

export const DEFAULT_ROTORHAZARD_PORT = 5000;
const DEFAULT_TIMEOUT_MS = 3000;
const MIN_TIMEOUT_MS = 500;
const MAX_TIMEOUT_MS = 15000;
const MIN_PORT = 1;
const MAX_PORT = 65535;

const clampTimeout = (timeoutMs: number | undefined): number => {
  if (typeof timeoutMs !== "number" || !Number.isFinite(timeoutMs)) {
    return DEFAULT_TIMEOUT_MS;
  }

  return Math.min(
    MAX_TIMEOUT_MS,
    Math.max(MIN_TIMEOUT_MS, Math.round(timeoutMs)),
  );
};

export const normalizeRotorHazardConnectionInput = (
  input: RotorHazardConnectionInput,
): NormalizedRotorHazardConnectionInput => {
  const rawHost = typeof input.host === "string" ? input.host.trim() : "";

  if (!rawHost) {
    throw new RotorHazardServiceError(
      "ROTORHAZARD_INVALID_SETTINGS",
      "RotorHazard host is required before Panevo can connect.",
    );
  }

  const rawPort = Number(input.port ?? DEFAULT_ROTORHAZARD_PORT);
  if (!Number.isInteger(rawPort) || rawPort < MIN_PORT || rawPort > MAX_PORT) {
    throw new RotorHazardServiceError(
      "ROTORHAZARD_INVALID_SETTINGS",
      `RotorHazard port must be between ${MIN_PORT} and ${MAX_PORT}.`,
    );
  }

  const hostWithProtocol = /^https?:\/\//i.test(rawHost)
    ? rawHost
    : `http://${rawHost}`;

  let url: URL;
  try {
    url = new URL(hostWithProtocol);
  } catch {
    throw new RotorHazardServiceError(
      "ROTORHAZARD_INVALID_SETTINGS",
      "RotorHazard host must be a valid hostname or IP address.",
    );
  }

  url.hash = "";
  url.search = "";
  url.pathname = "";
  url.port = String(rawPort);

  return {
    baseUrl: url.toString().replace(/\/$/, ""),
    host: url.hostname,
    port: rawPort,
    timeoutMs: clampTimeout(input.timeoutMs),
  };
};

export const createRotorHazardStatus = (
  input: NormalizedRotorHazardConnectionInput,
  message: string,
  overrides: Partial<RotorHazardConnectionStatus> = {},
): RotorHazardConnectionStatus => ({
  connected: true,
  baseUrl: input.baseUrl,
  transport: "socket.io",
  message,
  checkedAt: new Date().toISOString(),
  ...overrides,
});
