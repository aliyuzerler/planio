import { apiErrorBodySchema } from "@xenior/validation";

export class AppError extends Error {
  readonly code: string;
  readonly statusCode: number;

  constructor(message: string, code = "UNKNOWN_ERROR", statusCode = 500) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

export function normalizeApiError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  const parsed = apiErrorBodySchema.safeParse(error);
  if (parsed.success) {
    return new AppError(
      parsed.data.message,
      parsed.data.code,
      parsed.data.statusCode,
    );
  }

  if (error instanceof Error) {
    return new AppError(error.message);
  }

  return new AppError("An unexpected error occurred.");
}
