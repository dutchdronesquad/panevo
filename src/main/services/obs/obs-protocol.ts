import { createHash } from "node:crypto";
import type { ObsConnectionInput, ObsConnectionStatus } from "@/shared/types";
import { ObsServiceError } from "./obs-errors";

export type NormalizedObsConnectionInput = Required<
  Pick<ObsConnectionInput, "host" | "port" | "secure" | "timeoutMs">
> &
  Pick<ObsConnectionInput, "password">;

export type ObsProtocolMessage = {
  op: number;
  d?: unknown;
};

export type ObsRequestResponse = {
  requestId?: string;
  requestStatus?: {
    result?: boolean;
    code?: number;
    comment?: string;
  };
  responseData?: unknown;
};

export const OBS_RPC_VERSION = 1;

const DEFAULT_TIMEOUT_MS = 4000;
const MIN_TIMEOUT_MS = 1000;
const MAX_TIMEOUT_MS = 15000;

export const toRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
};

export const toStringValue = (value: unknown): string | undefined => {
  return typeof value === "string" && value.trim() ? value : undefined;
};

export const normalizeObsConnectionInput = (
  input: ObsConnectionInput,
): NormalizedObsConnectionInput => {
  const rawHost = input.host.trim();
  const secureFromUrl = rawHost.startsWith("wss://");
  const insecureFromUrl = rawHost.startsWith("ws://");
  const host = rawHost
    .replace(/^wss?:\/\//, "")
    .replace(/\/.*$/, "")
    .trim();

  if (!host) {
    throw new ObsServiceError(
      "OBS_INVALID_INPUT",
      "OBS host is required before Panevo can connect.",
    );
  }

  return {
    host,
    port: normalizePort(input.port),
    secure: secureFromUrl
      ? true
      : insecureFromUrl
        ? false
        : Boolean(input.secure),
    password: input.password,
    timeoutMs: normalizeTimeout(input.timeoutMs),
  };
};

export const createAuthentication = (
  password: string,
  salt: string,
  challenge: string,
): string => {
  const secret = createHash("sha256")
    .update(password + salt)
    .digest("base64");

  return createHash("sha256")
    .update(secret + challenge)
    .digest("base64");
};

export const createObsStatus = (
  input: NormalizedObsConnectionInput,
  message: string,
  overrides: Partial<ObsConnectionStatus> = {},
): ObsConnectionStatus => ({
  connected: true,
  host: input.host,
  port: input.port,
  secure: input.secure,
  message,
  checkedAt: new Date().toISOString(),
  ...overrides,
});

export const parseObsMessage = (data: unknown): ObsProtocolMessage => {
  const text =
    typeof data === "string"
      ? data
      : Buffer.isBuffer(data)
        ? data.toString("utf8")
        : data instanceof ArrayBuffer
          ? Buffer.from(data).toString("utf8")
          : "";

  if (!text) {
    throw new ObsServiceError(
      "OBS_PROTOCOL_ERROR",
      "OBS returned an empty or unsupported websocket message.",
    );
  }

  const parsed = JSON.parse(text) as unknown;
  const message = toRecord(parsed);
  if (!message || typeof message.op !== "number") {
    throw new ObsServiceError(
      "OBS_PROTOCOL_ERROR",
      "OBS returned a malformed websocket message.",
    );
  }

  return {
    op: message.op,
    d: message.d,
  };
};

const normalizePort = (port: number): number => {
  if (!Number.isFinite(port)) {
    return 4455;
  }

  return Math.min(65535, Math.max(1, Math.round(port)));
};

const normalizeTimeout = (timeoutMs?: number): number => {
  if (!timeoutMs || !Number.isFinite(timeoutMs)) {
    return DEFAULT_TIMEOUT_MS;
  }

  return Math.min(MAX_TIMEOUT_MS, Math.max(MIN_TIMEOUT_MS, timeoutMs));
};
