import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { CzApiSuccessResponse } from '../errors/error.constants';

/** Wraps all success responses as { success: true, data }. */
@Injectable()
export class ResponseTransformInterceptor<T>
  implements NestInterceptor<T, CzApiSuccessResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<CzApiSuccessResponse<T>> {
    return next.handle().pipe(
      map(
        (payload: T): CzApiSuccessResponse<T> => ({
          success: true as const,
          data: (payload ?? null) as T,
        }),
      ),
    );
  }
}
