export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

export function getErrorMessage(error: unknown, fallback = "Unknown error") {
  if (error instanceof Error) return error.message;
  return fallback;
}
