import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { MetricsStore } from '../core/metrics.store';

/** Records latency and success of every request for the Monitoring page. */
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private metrics: MetricsStore) {}

  intercept(_ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const start = Date.now();
    return next.handle().pipe(
      tap({
        next: () => this.metrics.record(Date.now() - start, true),
        error: (e: { status?: number }) =>
          this.metrics.record(Date.now() - start, (e?.status ?? 500) < 500),
      }),
    );
  }
}
