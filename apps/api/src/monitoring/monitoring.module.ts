import { Module } from '@nestjs/common';
import { PrometheusController } from './prometheus.controller';
import { MonitoringController } from './monitoring.controller';
import { MonitoringService } from './monitoring.service';

@Module({ controllers: [MonitoringController, PrometheusController], providers: [MonitoringService] })
export class MonitoringModule {}
