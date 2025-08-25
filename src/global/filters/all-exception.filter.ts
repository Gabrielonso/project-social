import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private httpAdapterHost: HttpAdapterHost) {}
  catch(exception: HttpException, host: ArgumentsHost) {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();

    const httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
    this.logger.error(
      `Exception: ${exception.message}, stack: ${exception.stack}`,
    );

    let statusCode = httpStatus;
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      const exceptionResponse = exception.getResponse();
      const exceptionCode = exception.getStatus();
      if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null &&
        'statusCode' in exceptionResponse
      ) {
        statusCode = (exceptionResponse as { statusCode: number }).statusCode;
      } else if (
        typeof exceptionCode === 'number' &&
        exceptionResponse !== null
      ) {
        statusCode = exceptionCode;
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
      } else if (
        typeof exceptionResponse === 'string' &&
        exceptionResponse !== null
      ) {
        message = exceptionResponse;
      }
    }

    const responseBody = {
      statusCode,
      message,
    };

    httpAdapter.reply(ctx.getResponse(), responseBody, httpStatus);
  }
}
