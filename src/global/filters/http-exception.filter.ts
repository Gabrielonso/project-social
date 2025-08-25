import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  constructor(private configService: ConfigService) {}
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();

    const isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';

    const isStaging = this.configService.get<string>('NODE_ENV') === 'staging';

    this.logger.error(`Exception: ${exception.message}, status: ${status}`);

    let statusCode = status;
    let message = exception.message || 'Something went wrong';

    if (exception instanceof HttpException) {
      const exceptionResponse = exception.getResponse();
      if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null &&
        'statusCode' in exceptionResponse
      ) {
        statusCode = (exceptionResponse as { statusCode: number }).statusCode;
      }

      if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null &&
        'message' in exceptionResponse
      ) {
        const msg = exceptionResponse as { message: string | string[] };
        if (Array.isArray(msg.message)) {
          message = msg.message[0];
        } else if (typeof msg.message == 'string') {
          message = msg.message;
        }
      }
    }

    response.status(status).json(
      isProduction
        ? {
            statusCode,
            timestamp: new Date().toISOString(),
            message,
          }
        : isStaging
          ? {
              statusCode,
              timestamp: new Date().toISOString(),
              message,
            }
          : {
              statusCode: status,
              timestamp: new Date().toISOString(),
              message,
              stackTrace: exception.stack,
            },
    );
  }
}
