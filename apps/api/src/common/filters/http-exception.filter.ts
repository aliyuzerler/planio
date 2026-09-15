import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import type { Request, Response } from "express";
import type { ApiErrorBody } from "@xenior/types";
import { safeErrorName } from "../logging/redact";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { statusCode, error, message, code, details } =
      this.normalize(exception);

    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error({
        path: request.url,
        method: request.method,
        statusCode,
        code,
        errorName: safeErrorName(exception),
      });
    }

    const body: ApiErrorBody = {
      statusCode,
      error,
      message,
      code,
      timestamp: new Date().toISOString(),
      path: request.url,
      details,
    };

    response.status(statusCode).json(body);
  }

  private normalize(exception: unknown): {
    statusCode: number;
    error: string;
    message: string;
    code: string;
    details?: unknown;
  } {
    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const response = exception.getResponse();
      const payload =
        typeof response === "string" ? { message: response } : response;
      const message = this.extractMessage(payload);
      return {
        statusCode,
        error: this.statusToError(statusCode),
        message,
        code: this.extractCode(payload) ?? this.statusToCode(statusCode),
        details: this.extractDetails(payload),
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: "Internal Server Error",
      message: "An unexpected error occurred.",
      code: "INTERNAL_ERROR",
    };
  }

  private extractMessage(payload: unknown): string {
    if (typeof payload === "object" && payload !== null && "message" in payload) {
      const message = (payload as { message: unknown }).message;
      if (Array.isArray(message)) {
        return message.map(String).join(", ");
      }
      if (typeof message === "string" && message.length > 0) {
        return message;
      }
    }
    return "Request failed.";
  }

  private extractDetails(payload: unknown): unknown {
    if (typeof payload === "object" && payload !== null) {
      if ("details" in payload) {
        const details = (payload as { details: unknown }).details;
        if (details !== undefined) {
          return details;
        }
      }
      if ("message" in payload) {
        const message = (payload as { message: unknown }).message;
        if (Array.isArray(message)) {
          return { validation: message.map(String) };
        }
      }
    }
    return undefined;
  }

  private extractCode(payload: unknown): string | undefined {
    if (typeof payload === "object" && payload !== null && "code" in payload) {
      const code = (payload as { code: unknown }).code;
      if (typeof code === "string" && /^[A-Z][A-Z0-9_]*$/.test(code)) {
        return code;
      }
    }
    return undefined;
  }

  private statusToError(statusCode: number): string {
    return HttpStatus[statusCode]?.replaceAll("_", " ") ?? "Error";
  }

  private statusToCode(statusCode: number): string {
    switch (statusCode) {
      case HttpStatus.BAD_REQUEST:
        return "BAD_REQUEST";
      case HttpStatus.UNAUTHORIZED:
        return "UNAUTHORIZED";
      case HttpStatus.FORBIDDEN:
        return "FORBIDDEN";
      case HttpStatus.NOT_FOUND:
        return "NOT_FOUND";
      case HttpStatus.CONFLICT:
        return "CONFLICT";
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return "VALIDATION_ERROR";
      default:
        return "HTTP_ERROR";
    }
  }
}
