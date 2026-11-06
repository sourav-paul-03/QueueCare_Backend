import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: any = 'Internal server error';
    let code = 'INTERNAL_ERROR';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'object' && res !== null) {
        message = (res as any).message || res;
        code = (res as any).error || code;
      } else {
        message = res;
      }
    } else if (exception && typeof exception === 'object') {
      const err = exception as any;
      if (err.code === 'ER_DUP_ENTRY') {
        status = HttpStatus.CONFLICT;
        message = 'Conflict: Duplicate entry or concurrent modification detected';
        code = 'ER_DUP_ENTRY';
      } else {
        this.logger.error(`Unhandled Exception: ${err.message}`, err.stack);
      }
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      code,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
