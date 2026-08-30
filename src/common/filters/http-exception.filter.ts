import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import {
  getCzErrorByCode,
  CzAuthErrorCodes,
  CzCommonErrorCodes,
  type CzApiErrorResponse,
} from '../errors/error.constants';

@Catch()
@Injectable()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();
    const { statusCode, body } = this.normalize(exception);

    if (statusCode >= 500) {
      this.logger.error(
        `${req.method} ${req.url} -> ${statusCode} ${body.cz_error_code}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    res.status(statusCode).json(body);
  }

  private normalize(exception: unknown): {
    statusCode: number;
    body: CzApiErrorResponse;
  } {
    const timestamp = new Date().toISOString();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const excResponse = exception.getResponse();
      const res =
        typeof excResponse === 'object' && excResponse !== null
          ? (excResponse as Record<string, unknown>)
          : {};

      const czCode =
        typeof res.cz_error_code === 'string' ? res.cz_error_code : null;
      if (czCode) {
        const { message, description, icon } = getCzErrorByCode(czCode);
        const override =
          typeof res.cz_error_description === 'string' &&
          res.cz_error_description.trim()
            ? res.cz_error_description
            : description;
        return {
          statusCode: status,
          body: {
            success: false,
            cz_error_code: czCode,
            cz_error_message: message,
            cz_error_description: override,
            cz_error_icon: icon,
            statusCode: status,
            timestamp,
          },
        };
      }

      // Nest-generated (ValidationPipe, throttler, 404 handler).
      const raw =
        'message' in res
          ? (res.message as string | string[] | undefined)
          : exception.message;
      const detail = Array.isArray(raw) ? raw.join(', ') : String(raw ?? '');
      const code = this.codeForStatus(status);
      const { message, description, icon } = getCzErrorByCode(code);
      return {
        statusCode: status,
        body: {
          success: false,
          cz_error_code: code,
          cz_error_message: message,
          cz_error_description: detail || description,
          cz_error_icon: icon,
          statusCode: status,
          timestamp,
        },
      };
    }

    const { message, description, icon } = getCzErrorByCode(
      CzCommonErrorCodes.INTERNAL_SERVER_ERROR,
    );
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      body: {
        success: false,
        cz_error_code: CzCommonErrorCodes.INTERNAL_SERVER_ERROR,
        cz_error_message: message,
        cz_error_description: description,
        cz_error_icon: icon,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        timestamp,
      },
    };
  }

  private codeForStatus(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return CzCommonErrorCodes.VALIDATION_FAILED;
      case HttpStatus.UNAUTHORIZED:
        return CzAuthErrorCodes.TOKEN_INVALID;
      case HttpStatus.FORBIDDEN:
        return CzAuthErrorCodes.FORBIDDEN;
      case HttpStatus.NOT_FOUND:
        return CzCommonErrorCodes.RESOURCE_NOT_FOUND;
      case HttpStatus.TOO_MANY_REQUESTS:
        return CzCommonErrorCodes.TOO_MANY_REQUESTS;
      case HttpStatus.SERVICE_UNAVAILABLE:
        return CzCommonErrorCodes.SERVICE_UNAVAILABLE;
      default:
        return CzCommonErrorCodes.INTERNAL_SERVER_ERROR;
    }
  }
}
