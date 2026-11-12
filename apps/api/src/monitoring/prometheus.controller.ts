import { Controller, Get, Header, Headers, UnauthorizedException } from '@nestjs/common';
import * as os from 'os';
import { Public } from '../common/public.decorator';
import { MetricsStore } from '../core/metrics.store';

/** Prometheus text exposition. Set METRICS_TOKEN to require `Authorization: Bearer <token>`. */
@Controller('metrics')
export class PrometheusController {
  constructor(private metrics: MetricsStore) {}

  @Public()
  @Get()
  @Header('Content-Type', 'text/plain; version=0.0.4')
  scrape(@Headers('authorization') auth?: string): string {
    const token = process.env.METRICS_TOKEN;
    if (token && auth !== `Bearer ${token}`) throw new UnauthorizedException();

    const all = this.metrics.recent(20000);
    const ok = all.filter((s) => s.ok).length;
    const sum = all.reduce((a, s) => a + s.ms, 0);
    const mem = process.memoryUsage();
    return [
      '# HELP http_requests_total Requests handled since the last restart (bounded window).',
      '# TYPE http_requests_total gauge',
      `http_requests_total{outcome="success"} ${ok}`,
      `http_requests_total{outcome="error"} ${all.length - ok}`,
      '# HELP http_request_duration_ms_sum Sum of request durations in the window.',
      '# TYPE http_request_duration_ms_sum gauge',
      `http_request_duration_ms_sum ${sum}`,
      '# HELP process_resident_memory_bytes Resident memory.',
      '# TYPE process_resident_memory_bytes gauge',
      `process_resident_memory_bytes ${mem.rss}`,
      '# HELP process_uptime_seconds Process uptime.',
      '# TYPE process_uptime_seconds gauge',
      `process_uptime_seconds ${Math.round(process.uptime())}`,
      '# HELP system_load_1m 1 minute load average.',
      '# TYPE system_load_1m gauge',
      `system_load_1m ${os.loadavg()[0]}`,
      '',
    ].join('\n');
  }
}
