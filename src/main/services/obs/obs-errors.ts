export class ObsServiceError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export const toObsError = (error: unknown): ObsServiceError => {
  if (error instanceof ObsServiceError) {
    return error;
  }

  if (error instanceof Error) {
    return new ObsServiceError("OBS_CONNECTION_FAILED", error.message);
  }

  return new ObsServiceError(
    "OBS_CONNECTION_FAILED",
    "Panevo could not complete the OBS websocket request.",
  );
};
