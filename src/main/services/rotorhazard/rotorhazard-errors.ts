export class RotorHazardServiceError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export const toRotorHazardError = (error: unknown): RotorHazardServiceError => {
  if (error instanceof RotorHazardServiceError) {
    return error;
  }

  if (error instanceof Error) {
    return new RotorHazardServiceError(
      "ROTORHAZARD_CONNECTION_FAILED",
      error.message,
    );
  }

  return new RotorHazardServiceError(
    "ROTORHAZARD_CONNECTION_FAILED",
    "Panevo could not complete the RotorHazard Socket.IO request.",
  );
};
