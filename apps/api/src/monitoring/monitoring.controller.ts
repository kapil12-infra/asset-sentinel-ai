import { Controller, Get, Query } from '@nestjs/common';
import type { MonitoringRange } from '@asset-sentinel/shared';
import { MonitoringService } from './monitoring.service';

@Controller('monitoring')
export class MonitoringController {
  constructor(private monitoring: MonitoringService) {}

  @Get()
  get(@Query('range') range?: string) {
    const r: MonitoringRange = range === '24h' || range === '7d' ? range : '1h';
    return this.monitoring.snapshot(r);
  }
}
