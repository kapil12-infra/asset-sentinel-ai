import { Injectable } from '@nestjs/common';
import * as os from 'os';
import type { MonitoringRange, MonitoringSnapshot } from '@asset-sentinel/shared';
import { MetricsStore } from '../core/metrics.store';

const RANGES: Record<MonitoringRange, { ms: number; buckets: number }> = {
  '1h': { ms: 3_600_000, buckets: 12 },
  '24h': { ms: 86_400_000, buckets: 24 },
  '7d': { ms: 604_800_000, buckets: 7 },
};

const round = (n: number, d = 1) => Math.round(n * 10 ** d) / 10 ** d;

@Injectable()
export class MonitoringService {
  private lastCpu = process.cpuUsage();
  private lastAt = Date.now();

  constructor(private metrics: MetricsStore) {}

  private cpuPercent(): number {
    const now = Date.now();
    const usage = process.cpuUsage(this.lastCpu);
    const elapsedMs = Math.max(now - this.lastAt, 1);
    this.lastCpu = process.cpuUsage();
    this.lastAt = now;
    const cores = os.cpus().length || 1;
    return Math.min(100, round(((usage.user + usage.system) / 1000 / elapsedMs / cores) * 100));
  }

  snapshot(range: MonitoringRange = '1h'): MonitoringSnapshot {
    const cfg = RANGES[range] ?? RANGES['1h'];
    const now = Date.now();
    const from = now - cfg.ms;
    const step = cfg.ms / cfg.buckets;
    const all = this.metrics.between(from, now);

    const series = Array.from({ length: cfg.buckets }, (_, i) => {
      const start = from + i * step;
      const inBucket = all.filter((s) => s.t >= start && s.t < start + step);
      const label =
        range === '7d'
          ? new Date(start).toLocaleDateString('en-US', { weekday: 'short' })
          : new Date(start).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
      const value = inBucket.length ? inBucket.reduce((a, s) => a + s.ms, 0) / inBucket.length : 0;
      return { label, value: round(value) };
    });

    const ok = all.filter((s) => s.ok).length;
    const memUsed = process.memoryUsage().rss;
    return {
      range,
      uptime: all.length ? round((ok / all.length) * 100, 2) : 100,
      responseMs: all.length ? Math.round(all.reduce((a, s) => a + s.ms, 0) / all.length) : 0,
      cpu: this.cpuPercent(),
      memory: round((memUsed / os.totalmem()) * 100),
      series,
    };
  }
}
